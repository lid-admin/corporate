# https://report.lid-iinan.com

## 問い合わせフォーム設定

問い合わせフォームは **Google reCAPTCHA v2（チェックボックス）** と **Formspree** を使用しています。
本サイトはビルドプロセスを持たない静的HTMLサイトのため、設定値はすべて `index.html` に直接記述されています（`.env` やフレームワークの設定ファイルはありません）。

### 現在の設定値

- **reCAPTCHA v2 サイトキー**: `index.html` 内 `initContactModal()` の `grecaptcha.render('contact-recaptcha', { sitekey: '...' })` に直接記述
- **Formspree フォームID**: `index.html` 内 `<form id="contact-form" class="contact-form" action="https://formspree.io/f/{Form ID}" ...>` の `action` 属性に直接記述

サイトキー・フォームIDはいずれもクライアント側に公開される前提の値であり機密情報ではないため、直接コードに記述しています。

### 値を変更する場合

#### 1. reCAPTCHA v2の再設定

1. **Google reCAPTCHA管理画面**にアクセス: https://www.google.com/recaptcha/admin
2. 新しいサイトを登録:
   - **reCAPTCHAタイプ**: **reCAPTCHA v2「私はロボットではありません」チェックボックス** を選択
   - **ドメイン**:
     ```
     report.lid-iinan.com
     localhost
     127.0.0.1
     ```
3. 発行された **Site Key** を `index.html` 内の `grecaptcha.render()` の `sitekey` の値に置き換える
4. **Secret Key** はFormspree側の設定で使用する（次のステップ）

#### 2. Formspreeの再設定

1. **Formspreeにサインアップ / ログイン**: https://formspree.io/
2. フォームを作成し、**Form ID**をコピー（例: `xbgrnvbq`）
3. `index.html` 内 `<form id="contact-form" class="contact-form" action="https://formspree.io/f/{Form ID}" method="POST">` の `action` を更新する

#### 3. Formspreeダッシュボードの設定

Formspreeダッシュボードで以下を設定してください：

**a) Domain Restrictions（セキュリティ）**

Settings > Domain Restrictions:
```
report.lid-iinan.com
localhost
```

**b) reCAPTCHA設定（スパム対策）**

Settings > reCAPTCHA settings:
- reCAPTCHAを有効化
- **Custom reCAPTCHA key** に上記の **Secret Key** を入力
- 保存

**c) Email Notifications（通知設定）**

Settings > Email Notifications:
- 通知先メールアドレスを設定
- 確認メールのリンクをクリック（重要。クリックしないと送信通知が届きません）
