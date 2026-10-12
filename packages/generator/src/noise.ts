import type { IdFactory } from './ids';
import type { SyntheticEvent } from './model';
import type { Rng } from './rng';
import { SCENARIO_HOURS } from './scenario';

const DAY_MS = SCENARIO_HOURS * 3600_000;
const SECOND = 1000;
const MINUTE = 60 * SECOND;

/** 監視対象(架空)。ホスト名とサービス名 */
export const HOSTS = [
  { host: 'web-01', service: 'checkout-api' },
  { host: 'web-02', service: 'catalog-api' },
  { host: 'auth-01', service: 'auth-api' },
  { host: 'worker-01', service: 'mail-worker' },
  { host: 'db-01', service: 'orders-db' },
] as const;

const PRODUCTS = ['P-1001', 'P-1002', 'P-1003', 'P-2001', 'P-2002', 'P-3001'];

type Flow = (at: number) => SyntheticEvent[];

/**
 * 平常時のイベント(ノイズ)を作る。実際の利用に近づけるため、1人の利用者の一連の操作を
 * 「流れ」として作り、同じ流れのイベントは関連 ID でつながるようにする。
 * 監視の定期イベントは件数に関係なく入れる。
 */
export function generateNoise(
  startMs: number,
  targetCount: number,
  rng: Rng,
  ids: IdFactory,
): SyntheticEvent[] {
  const event = (
    at: number,
    rest: Omit<SyntheticEvent, 'at' | 'fields'> & { fields?: Record<string, string> },
  ): SyntheticEvent => ({ at, fields: {}, ...rest });
  const latency = () => `${rng.int(18, 240)}ms`;

  const order: Flow = (at) => {
    const user = ids.next('user');
    const trace = ids.next('trace');
    const orderId = ids.next('order');
    const amount = String(rng.int(8, 300) * 100);
    const events = [
      event(at, {
        source: 'app',
        type: 'http_request',
        severity: 'info',
        message: `POST /api/orders 201 ${latency()}`,
        ids: { trace, user },
        fields: { service: 'checkout-api' },
      }),
      event(at + rng.int(200, 900), {
        source: 'business',
        type: 'order_confirmed',
        severity: 'info',
        message: `Order confirmed (${rng.int(1, 4)} items)`,
        ids: { order: orderId, user },
        fields: { amount },
      }),
      event(at + rng.int(1, 3) * SECOND, {
        source: 'app',
        type: 'payment_authorized',
        severity: 'info',
        message: `Payment authorized by ExamplePay ${latency()}`,
        ids: { trace, user },
        fields: { service: 'checkout-api' },
      }),
      event(at + rng.int(3, 6) * SECOND, {
        source: 'business',
        type: 'payment_captured',
        severity: 'info',
        message: 'Payment captured',
        ids: { order: orderId, user },
        fields: { amount },
      }),
      event(at + rng.int(5, 30) * SECOND, {
        source: 'app',
        type: 'mail_sent',
        severity: 'info',
        message: 'Order confirmation mail sent',
        ids: { trace, user },
        fields: { service: 'mail-worker' },
      }),
      event(at + rng.int(30, 360) * MINUTE, {
        source: 'business',
        type: 'shipment_requested',
        severity: 'info',
        message: 'Shipment requested to warehouse',
        ids: { order: orderId, user },
        fields: { amount },
      }),
    ];
    // 一時的な失敗と再試行(平常時にも少しある)
    if (rng.chance(0.03)) {
      events.push(
        event(at + rng.int(1, 3) * SECOND, {
          source: 'business',
          type: 'payment_retry',
          severity: 'warn',
          message: 'Payment capture retried (gateway busy)',
          ids: { order: orderId, user },
          fields: { amount },
        }),
      );
    }
    return events;
  };

  const browse: Flow = (at) => {
    const user = ids.next('user');
    const trace = ids.next('trace');
    const count = rng.int(1, 4);
    return Array.from({ length: count }, (_, i) =>
      event(at + i * rng.int(2, 40) * SECOND, {
        source: 'app',
        type: 'http_request',
        severity: rng.chance(0.15) ? 'debug' : 'info',
        message: `GET /api/products/${rng.pick(PRODUCTS)} 200 ${latency()}`,
        ids: { trace, user },
        fields: { service: 'catalog-api' },
      }),
    );
  };

  const login: Flow = (at) => {
    const user = ids.next('user');
    const trace = ids.next('trace');
    const failedFirst = rng.chance(0.05);
    const events: SyntheticEvent[] = [];
    if (failedFirst) {
      events.push(
        event(at - rng.int(5, 30) * SECOND, {
          source: 'app',
          type: 'login_failed',
          severity: 'warn',
          message: 'Login failed: invalid password (1/5)',
          ids: { trace: ids.next('trace'), user },
          fields: { service: 'auth-api' },
        }),
      );
    }
    events.push(
      event(at, {
        source: 'app',
        type: 'login_succeeded',
        severity: 'info',
        message: 'Login succeeded',
        ids: { trace, user },
        fields: { service: 'auth-api' },
      }),
      event(at + rng.int(50, 400), {
        source: 'audit',
        type: 'login',
        severity: 'info',
        message: 'User signed in',
        ids: { user },
        fields: { actor: user },
      }),
    );
    return events;
  };

  const admin: Flow = (at) => {
    const operator = rng.pick(['admin-tanaka', 'admin-suzuki', 'support-sato', 'support-ito']);
    return [
      event(at, {
        source: 'audit',
        type: rng.pick(['view_order', 'export_report', 'view_user']),
        severity: 'info',
        message: 'Viewed in back office',
        ids: { order: ids.next('order') },
        fields: { actor: operator },
      }),
    ];
  };

  const slowQuery: Flow = (at) => [
    event(at, {
      source: 'app',
      type: 'slow_query',
      severity: 'warn',
      message: `Slow query on orders-db ${rng.int(500, 1500)}ms`,
      ids: { trace: ids.next('trace') },
      fields: { service: 'checkout-api' },
    }),
  ];

  const flows: [Flow, number][] = [
    [order, 0.45],
    [browse, 0.33],
    [login, 0.15],
    [admin, 0.04],
    [slowQuery, 0.03],
  ];

  // 監視の定期イベント: 10分ごとのヘルスチェックと、1時間ごとの CPU 使用率
  const events: SyntheticEvent[] = [];
  for (let t = 0; t < DAY_MS; t += 10 * MINUTE) {
    for (const { host, service } of HOSTS) {
      events.push(
        event(startMs + t + rng.int(0, 20 * SECOND), {
          source: 'infra',
          type: t % (60 * MINUTE) === 0 ? 'metric' : 'healthcheck',
          severity: 'info',
          message: t % (60 * MINUTE) === 0 ? `CPU usage ${rng.int(8, 55)}%` : 'Health check passed',
          ids: {},
          fields: { host, service },
        }),
      );
    }
  }

  while (events.length < targetCount) {
    let roll = rng.next();
    const flow = flows.find(([, weight]) => (roll -= weight) < 0)?.[0] ?? order;
    // 昼間に多く、深夜に少なくする(時刻の分布に偏りを付ける)
    const at = startMs + diurnalOffset(rng);
    events.push(...flow(at).filter((e) => e.at >= startMs && e.at < startMs + DAY_MS));
  }
  return events;
}

/** 0〜24時間の経過時間を、日中(9〜22時)に寄せて選ぶ */
function diurnalOffset(rng: Rng): number {
  for (;;) {
    const offset = rng.int(0, DAY_MS - 1);
    const hour = offset / 3600_000;
    const weight = hour >= 9 && hour < 22 ? 1 : 0.25;
    if (rng.chance(weight)) return offset;
  }
}
