# ログイン・アカウント機能の設定

このアプリの認証、セッション、プロフィールDB、プロフィール画像にはSupabaseを使用します。クイズ問題・ランキング用のGASは引き続き使用します。

## 1. Supabaseプロジェクトを作成

1. [Supabase Dashboard](https://supabase.com/dashboard)へログインします。
2. 「New project」を押します。
3. プロジェクト名、データベースパスワード、リージョンを設定します。
4. プロジェクト作成が完了するまで待ちます。

## 2. データベースと画像保存先を作成

1. Supabase Dashboardの「SQL Editor」を開きます。
2. リポジトリの supabase/schema.sql をすべて貼り付けます。
3. 「Run」を押します。
4. Table Editorに profiles、Storageに非公開の avatars バケットが作成されたことを確認します。

profiles にはパスワードを保存しません。パスワードはSupabase Authの保護された領域でハッシュ化されます。RLSにより、ログインユーザーは自分のプロフィールだけを取得・更新できます。

## 3. Gmail SMTPと6桁のメールOTPを設定

### 3-1. Gmailのアプリパスワードを作成

1. [Googleアカウントのセキュリティ](https://myaccount.google.com/security)で2段階認証を有効にします。
2. [アプリパスワード](https://myaccount.google.com/apppasswords)を開きます。
3. アプリ名に `Style Quiz Supabase` と入力して作成します。
4. 表示された16桁のアプリパスワードを控えます。

アプリパスワードはチャット、GitHub、JavaScriptへ貼り付けないでください。SupabaseのSMTP設定画面へだけ入力します。学校・職場の管理対象アカウントや高度な保護機能を使用しているアカウントでは、アプリパスワードを作成できない場合があります。

### 3-2. SupabaseへGmail SMTPを設定

1. Supabase Dashboardの「Authentication」→「SMTP Settings」を開きます。
2. 「Enable custom SMTP」を有効にします。
3. 次の値を入力して保存します。

| 項目 | 設定値 |
| --- | --- |
| Sender email | 使用するGmailアドレス |
| Sender name | みんなの雑学クイズ |
| Host | smtp.gmail.com |
| Port | 465 |
| Username | 使用するGmailアドレス |
| Password | 手順3-1で作成した16桁のアプリパスワード |

通常のGoogleアカウントのパスワードは入力しません。

### 3-3. 6桁OTPを設定

1. 「Authentication」→「Providers」→「Email」を開きます。
2. Emailを有効にします。
3. OTPの有効期限を600秒（10分）程度に設定します。
4. 「Authentication」→「Email Templates」→「Magic Link」を開きます。
5. 本文に認証コード用の変数 {{ .Token }} を含めます。

メール本文例:

    <h2>認証コード</h2>
    <p>Style Quizの認証コードは次の6桁です。</p>
    <p style="font-size: 28px; font-weight: bold;">{{ .Token }}</p>
    <p>このコードには有効期限があります。心当たりがない場合は無視してください。</p>

{{ .ConfirmationURL }} ではなく {{ .Token }} を使用すると、6桁の認証コードが送られます。Supabase側にも再送信のレート制限があります。

Supabaseの標準メール送信はチーム登録済みアドレスだけが対象で、送信回数も少ないため、本番公開では上記の独自SMTP設定が必要です。

## 4. 公開URLを登録

「Authentication」→「URL Configuration」で次を設定します。

- Site URL: https://myapp-9us.pages.dev
- Redirect URLs: https://myapp-9us.pages.dev/**

## 5. フロントエンドの接続情報を設定

「Project Settings」→「API Keys」で、Project URLとPublishable keyを確認します。

次の2ファイルを同じ値に変更します。

- quiz-game/supabase-config.js
- public/supabase-config.js

設定例:

    window.SUPABASE_CONFIG = Object.freeze({
      url: "https://プロジェクトID.supabase.co",
      publishableKey: "sb_publishable_...",
    });

Publishable keyはRLSと組み合わせてブラウザで使用するキーです。service_role keyやデータベースパスワードは絶対にフロントエンドへ記載しないでください。

## 6. 動作確認

1. 公開サイトで「アカウント作成」を押します。
2. メールアドレスへ6桁コードが届くことを確認します。
3. コードを入力し、12文字以上のパスワードを設定します。
4. 名前、性別、年齢、任意の画像を登録します。
5. マイページでプロフィールを変更できることを確認します。
6. ログアウト後、メールアドレスとパスワードで再ログインします。

## セキュリティ設計

- パスワード: Supabase Authがハッシュ化して保存し、公開テーブルへ保存しません。
- SQLインジェクション: ブラウザから生SQLを組み立てず、Supabase APIの条件指定を使用します。
- XSS: ユーザー入力は textContent またはフォームの value で扱い、HTMLとして挿入しません。
- CSRF: 認証は自動送信されるCookieではなくAuthorizationヘッダーのセッションを使用します。
- 認可: PostgreSQL RLSの auth.uid() とユーザーIDを照合します。
- 画像: JPEG、PNG、WebPのみ、最大2MB、本人のフォルダーだけアップロード可能です。
- メール重複: Supabase Authと profiles.email の一意制約で防止します。
- HTTP保護: Cloudflare Pagesの _headers でCSP、クリックジャッキング対策などを設定します。
