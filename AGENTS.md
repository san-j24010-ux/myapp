# AGENTS

## GAS 開発ルール
- プロジェクト直下に `gas` ディレクトリがなければ作成してください。
- すべての GAS 関連作業は `gas/` ディレクトリ内で行ってください。
- まずはブラウザ版エディタの URL から `clasp` でクローンしてから開発を進めてください。
- フロントエンドにハードコードする GAS のエンドポイントは次を使用してください。
  - https://script.google.com/macros/s/AKfycbwg0alV9GBUPBylCDX6kh4mi20UjcbBb9bO4F7ThGH_JcffaiZnwmGNPywnSCpzyAL0rA/exec
- GAS は JavaScript から GET のみ受信できるため、`mode` パラメータで動作を切り替えてください。
