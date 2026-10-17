# event-timeline-poc

**デモ: https://event-timeline-poc.pages.dev** (日本語 / English)

> 表示しているのは、すべて架空の合成データです。実在の会社・サービス・人物とは関係ありません。

システムや業務で問題が発生した際、ログや処理履歴が複数の場所に分散していると、何がいつ起き、どの事象が先行していたのかを把握するのに時間がかかる。
そこで、異なる情報源のイベントを共通の時間軸に並べ、発生順序や関連性を確認できる仕組みを試作する。
まずはサンプルデータを用いて調査のしやすさを検証し、特定の業務やシステムに依存しない、イベント分析のための共通基盤として活用できるかを探る。

## デモでできること

4 種類の情報源(アプリケーションログ・業務処理履歴・インフラ / 監視イベント・操作 / 監査ログ)のイベント約 1 万件を、1 本のタイムラインに並べる。
形式も時刻の書き方もばらばらなファイルを、取り込みの段階で共通の形にそろえている。

- シナリオ(障害 3 本・問い合わせ 2 本)を選び、散らばったイベントから原因を探す。最後に答え合わせができる
- 注文 ID・ユーザー ID・トレース ID で、同じ対象のイベントだけを全情報源から抜き出す
- 時間帯ごとの件数のグラフをドラッグして期間を絞る。情報源・種別・重要度・キーワードでも絞り込める
- イベントを選ぶと、変換前の元データ(元のファイル・行・時刻の文字列)を確かめられる
- 表示中の条件は URL に入るので、そのまま共有できる

## 感想・要望

[GitHub Discussions](https://github.com/shun968-org/event-timeline-poc/discussions) で受け付けている。

- 感想: [General](https://github.com/shun968-org/event-timeline-poc/discussions/categories/general)
- 改善要望: [Ideas](https://github.com/shun968-org/event-timeline-poc/discussions/categories/ideas)
- 本番でも使いたいか: [投票](https://github.com/shun968-org/event-timeline-poc/discussions/36)

## ローカルで動かす

devContainer(`.devcontainer/`)で開くと、`npm install` まで自動で済む。

```sh
npm run generate -- --all   # シナリオ定義(scenarios/)から合成データを datasets/ に作る
npm run ingest -- --all     # 情報源の定義(sources/)で取り込み、画面用の静的 JSON を作る
npm run dev                 # 画面を起動する
```

## 構成

| 場所 | 内容 |
|---|---|
| `packages/core` | 共通イベント形式・静的 JSON・情報源の定義ファイルの型とスキーマ |
| `packages/generator` | シナリオ定義から 4 種類の情報源の合成データを作る |
| `packages/ingest` | 情報源のファイルを共通イベント形式の静的 JSON に変換する |
| `packages/web` | タイムラインの画面(React + Vite) |
| `scenarios/` | 検証シナリオの定義 |
| `sources/` | 情報源の定義(形式・時刻の書き方・項目の対応)。情報源の追加はここにファイルを足すだけ |

DB・API・認証は使わず、静的ファイルだけを Cloudflare Pages で公開している(`main` への反映で自動デプロイ)。

## ドキュメント

- 技術選定の記録: [`docs/adr/`](docs/adr/)(TypeScript で統一・静的サイトで公開)
- 開発の進め方: [CONTRIBUTING.md](CONTRIBUTING.md)
- 要件定義・基本設計は Notion で管理している(非公開)

## ライセンス

[MIT](LICENSE)
