#!/usr/bin/env bash
#
# Cloudflare Pages に公開するファイル(ビルド結果)を、デプロイの前に検査する(基本設計 F-08)。
#   - 画面とデータの一覧(index.html・data/index.json)がある
#   - 1ファイルが Pages の上限(25 MiB)以下、ファイル数が上限(20,000)以下
#   - 関数を使わない(_worker.js・_routes.json・functions/ が無い)。使うと従量課金・回数上限の対象になる
#   - 秘密情報らしいファイル(.env・鍵など)が無い
# 問題があれば全部を出してから、終了コード 1 で終わる。
#
# 使い方: scripts/check-public-files.sh <公開するディレクトリ>

set -euo pipefail

MAX_FILE_BYTES=$((25 * 1024 * 1024))
MAX_FILES=20000

dir="${1:?公開するディレクトリを指定してください}"
if [[ ! -d "$dir" ]]; then
  echo "エラー: ディレクトリ '$dir' がありません" >&2
  exit 1
fi

errors=()

for required in index.html data/index.json; do
  [[ -f "$dir/$required" ]] || errors+=("$required がありません")
done

count="$(find "$dir" -type f | wc -l)"
(( count <= MAX_FILES )) || errors+=("ファイルが ${count} 個あり、上限の ${MAX_FILES} 個を超えています")

while IFS= read -r -d '' file; do
  size="$(stat -c %s "$file")"
  errors+=("${file#"$dir"/} が $((size / 1024 / 1024)) MiB で、上限の 25 MiB を超えています")
done < <(find "$dir" -type f -size +"${MAX_FILE_BYTES}"c -print0)

while IFS= read -r -d '' file; do
  errors+=("${file#"$dir"/} は関数の定義です(関数は使わない)")
done < <(find "$dir" \( -name '_worker.js' -o -name '_routes.json' -o \( -type d -name functions \) \) -print0)

while IFS= read -r -d '' file; do
  errors+=("${file#"$dir"/} は秘密情報のファイルかもしれません")
done < <(find "$dir" -type f \( -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' \
  -o -name 'id_rsa*' -o -name 'id_ed25519*' -o -name '.npmrc' -o -name '*.p12' \) -print0)

if (( ${#errors[@]} > 0 )); then
  echo "公開するファイルの検査に失敗しました($dir):" >&2
  printf '  - %s\n' "${errors[@]}" >&2
  exit 1
fi

total="$(du -sh "$dir" | cut -f1)"
largest="$(find "$dir" -type f -printf '%s %P\n' | sort -n | tail -1)"
echo "公開するファイルの検査: OK(${count} ファイル、合計 ${total}、最大 $((${largest%% *} / 1024)) KiB: ${largest#* })"
