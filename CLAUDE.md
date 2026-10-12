# CLAUDE.md

## このリポジトリ

システムや業務の異なる情報源のイベントを共通の時間軸に並べ、発生順序や関連性を確認する仕組みの試作(PoC)。
概要は [README.md](README.md)。技術選定は ADR に残す(TypeScript・npm workspaces は ADR-0001、静的サイトでの公開は ADR-0002)。

## 構成とコマンド

- `packages/core`(共通の型・スキーマ)、`generator`(合成データ生成)、`ingest`(取り込み CLI)、`web`(React + Vite の画面)。
  各パッケージは `src/index.ts` をそのまま公開し、ビルドせずに参照する(Vite・tsx・Vitest が TypeScript を直接読む)
- `npm run dev`(画面)/ `npm run typecheck` / `npm run lint` / `npm run format:check` / `npm test` / `npm run build`。
  CI の `repo-checks` が同じものを実行する
- 合成データ: `npm run generate -- <シナリオ名> | --all`。`scenarios/*.yaml` から `datasets/<シナリオ名>/`(git 管理外)を作る。
  イベント ID は `<ファイル名>:<行番号>`(`eventId`)で、正解の順序もこの ID で持つ
- 取り込み: `npm run ingest -- <データセット名> | --all`。`sources/*.yaml` の定義で `datasets/` を読み、
  `packages/web/public/data/`(git 管理外)に `<データセット>.json` と `index.json` を書く
- 画面の文言は `packages/web/src/i18n/ja.json`・`en.json` に同じキーで足す(片方だけだとテストが失敗する)
- 画面の条件はすべて URL のクエリ文字列に持つ(`packages/web/src/view-state.ts`)。データは `DataSource` 経由で読む。
  画面の操作のテストは先頭に `// @vitest-environment jsdom` を書き、描画と操作を `await act(async () => …)` で包む(Suspense の読み込みを待つため)

## 開発規約

- ブランチ・コミット・PR の規約は [CONTRIBUTING.md](CONTRIBUTING.md)。lefthook と commitlint で機械的に強制される
- ADR は `docs/adr/`(`managing-adrs` スキル)。要件・設計ドキュメントは `managing-notion-docs` スキル
- Notion(`ntn`)の認証と権限制御は `managing-notion-docs` スキルの「前提条件」。`NOTION_API_TOKEN`(最小権限の内部インテグレーション)を使い、`ntn login` / `ntn auth` は使わない
- CI は `.github/workflows/ci.yml`(型検査・lint・書式・テスト・ビルド・ADR 書式・PR タイトル・ブランチ名)
- デプロイは `.github/workflows/deploy.yml`。main への反映で、生成 → 取り込み → ビルド → `scripts/check-public-files.sh` → Cloudflare Pages。
  Cloudflare のトークンは GitHub の環境 `production`(main だけ)のシークレットにあり、devContainer には置かない(ADR-0002)

## Dev container

- `.devcontainer/` に定義。ベースは言語非依存の Debian イメージで、Node.js(実装・lefthook/commitlint 用)と `gh` を含む。
  他の言語は `devcontainer.json` の `features` に追加する
- Claude Code の sandbox(bubblewrap)は使わない。ホストのカーネル設定
  (Ubuntu 系の `kernel.apparmor_restrict_unprivileged_userns=1`)次第で動かず、各自のホスト設定に頼れないため。
  代わりにコンテナ全体の外向き通信を `.devcontainer/init-firewall.sh`(iptables + ipset)で許可ドメインだけに絞る
- ネットワークの許可ドメインは `init-firewall.sh` の `ALLOWED_DOMAINS`(言語の依存取得先が増えたらここに足し、rebuild する)。
  スクリプトはイメージに焼き込むため、コンテナ内でリポジトリのファイルを書き換えても反映されない
- Claude Code の devcontainer feature(`ghcr.io/anthropics/devcontainer-features/claude-code`)は使わない。
  独自の `init-firewall.sh` を `/usr/local/bin` に上書きコピーし、自前のファイアウォールを置き換えてしまうため。
  Claude Code は `postCreateCommand` で `npm install -g` する
- コンテナ内の `vscode` ユーザーの sudo は `init-firewall.sh`だけに限定している(ファイアウォールを外せないようにするため)。
  コンテナ内で `apt install` などはできないので、必要なものは `Dockerfile` か `features` に足す
- 機密(`.ssh`, `.aws`, `.credentials*`, `secrets/`)は permissions で読み取りを拒否している。
  `.env` はエージェントが読める(編集は拒否、git 管理外)。
  **運用ルール: `.env` にはエージェント向けの認証情報(`NOTION_API_TOKEN`)だけを書く。人間用・本番用の資格情報は置かない**。
  これがセキュリティの前提。`.env` が無いと起動に失敗するため、`initializeCommand` で空ファイルを作る
