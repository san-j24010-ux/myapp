# StyleFinder

Pinterest風のダークテーマUIでファッションアイテムを検索できるWebアプリです。楽天市場APIやYahoo!ショッピングAPIから商品情報を取得し、Google Apps Scriptで加工してフロントへ返します。

## 構成

- HTML5 / CSS3 / Vanilla JavaScript フロントエンド
- Google Apps Script バックエンド
- Google Spreadsheet でお気に入り / ランキング / キーワードログを保存
- Cloudflare Pages でホスティング
- GitHub でバージョン管理

## ファイル構成

```
myapp
│
├── index.html
├── search.html
├── detail.html
├── favorite.html
├── ranking.html
│
├── css
│   ├── reset.css
│   ├── style.css
│   ├── home.css
│   ├── search.css
│   └── detail.css
│
├── js
│   ├── app.js
│   ├── api.js
│   ├── home.js
│   ├── search.js
│   ├── detail.js
│   ├── favorite.js
│   └── ranking.js
│
├── assets
│   ├── icons
│   └── images
│
├── gas
│   ├── appsscript.json
│   └── コード.js
│
├── AGENTS.md
└── README.md
```

## ローカル確認方法

単純にブラウザで `index.html` を開くすると、ダミーデータで動作確認できます。

### GitHub Pages / Cloudflare Pages で公開

`index.html` をルートとして `css/` `js/` `assets/` の静的ファイルを公開します。

## 今後の実装予定

- GAS で楽天市場・Yahoo!ショッピング検索 API を組み込み
- お気に入り、ランキング、検索履歴を Google スプレッドシートへ保存
- `mode` パラメータによる GAS ルーティング
- AI コーデ提案機能（OpenRouter API 連携）は次フェーズで実装予定
