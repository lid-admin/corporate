# https://lid-iinan.com

Local Impact Design飯南株式会社のウェブサイト。
ビルド工程を持たない静的HTMLサイトで、GitHub Pages で公開しています。

## 各種手順

| やりたいこと | 参照先 |
|---|---|
| **活動レポートを追加する** | [docs/レポートの追加手順.md](docs/レポートの追加手順.md) |
| タグを追加・変更する | [docs/レポートの追加手順.md#タグについて](docs/レポートの追加手順.md#タグについて) |
| 画像を縮小する | `./scripts/optimize-images.py --apply` |
| 画像サイズの目安を知る | [images/README.md](images/README.md) |
| 問い合わせフォームを設定する | 下記「問い合わせフォーム設定」 |
| ドメインを切り替える | 下記「ドメイン設定」 |

## 問い合わせフォーム設定

問い合わせフォームは **Google reCAPTCHA v2（チェックボックス）** と **Formspree** を使用しています。
本サイトはビルドプロセスを持たない静的HTMLサイトのため、設定値はすべて `contact.html` に直接記述されています（`.env` やフレームワークの設定ファイルはありません）。

**問い合わせフォームの定義は `contact.html` の1箇所のみです。** 他のページからはこのページへリンクしています。

### 現在の設定値

- **reCAPTCHA v2 サイトキー**: `contact.html` 内 `initContactForm()` の `grecaptcha.render('contact-recaptcha', { sitekey: '...' })` に直接記述
- **Formspree フォームID**: `contact.html` 内 `<form id="contact-form" class="contact-form" action="https://formspree.io/f/{Form ID}" ...>` の `action` 属性に直接記述

サイトキー・フォームIDはいずれもクライアント側に公開される前提の値であり機密情報ではないため、直接コードに記述しています。

### 値を変更する場合

#### 1. reCAPTCHA v2の再設定

1. **Google reCAPTCHA管理画面**にアクセス: https://www.google.com/recaptcha/admin
2. 新しいサイトを登録:
   - **reCAPTCHAタイプ**: **reCAPTCHA v2「私はロボットではありません」チェックボックス** を選択
   - **ドメイン**:
     ```
     lid-iinan.com
     localhost
     127.0.0.1
     ```
3. 発行された **Site Key** を `contact.html` 内の `grecaptcha.render()` の `sitekey` の値に置き換える
4. **Secret Key** はFormspree側の設定で使用する（次のステップ）

#### 2. Formspreeの再設定

1. **Formspreeにサインアップ / ログイン**: https://formspree.io/
2. フォームを作成し、**Form ID**をコピー（例: `xbgrnvbq`）
3. `contact.html` 内 `<form id="contact-form" class="contact-form" action="https://formspree.io/f/{Form ID}" method="POST">` の `action` を更新する

#### 3. Formspreeダッシュボードの設定

Formspreeダッシュボードで以下を設定してください：

**a) Domain Restrictions（セキュリティ）**

Settings > Domain Restrictions:
```
lid-iinan.com
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


---

## ドメイン設定

本サイトは **lid-iinan.com** で公開する。
コード内の `canonical` / `og:url` / `sitemap.xml` / `robots.txt` は
すべてこのドメインで記述済み（62箇所）。

### 未完了の作業

旧サイト（Studio製）からの切り替えにあたり、以下が残っている。

| # | 対象 | 作業 |
|---|---|---|
| 1 | `CNAME` | **現在リポジトリに無い。** GitHub Pages の Settings > Pages で<br>カスタムドメインに `lid-iinan.com` を設定すると自動で作成される |
| 2 | DNS | `lid-iinan.com` を GitHub Pages に向ける（Studio の設定解除が必要） |
| 3 | GitHub Pages | カスタムドメインの設定と、HTTPS証明書の発行を待つ |
| 4 | reCAPTCHA 管理画面 | 許可ドメインに `lid-iinan.com` を追加 |
| 5 | Formspree ダッシュボード | Domain Restrictions に `lid-iinan.com` を追加 |
| 6 | Google Analytics | 必要に応じてプロパティのURL設定を変更 |
| 7 | Google Search Console | 新しいドメインでの登録と sitemap の送信 |

**4と5を忘れると問い合わせフォームが動きません。** 切り替え直後に必ず実送信して確認すること。

### 切り替え後の確認

- [ ] `https://lid-iinan.com/` が表示される
- [ ] 旧URL（`/About_us` `/Service` `/ｍember` `/contact_us` `/privacy` `/利用規約`）から新ページへ転送される
- [ ] 問い合わせフォームが送信でき、通知メールが届く
- [ ] `https://lid-iinan.com/sitemap.xml` と `/robots.txt` が表示される
- [ ] 既存の記事URL（`/pages/report.html?id=1` 〜 `?id=16`）がすべて表示される
- [ ] ファビコンが表示される（`/favicon.ico` を直接開いて確認）

### ドメインを変更する場合

将来さらに別のドメインへ移す場合は、リポジトリのルートで一括置換する。

```bash
# 置換対象を確認する
grep -rl 'lid-iinan\.com' --include='*.html' --include='*.xml' --include='*.txt' .

# 置換を実行する（farm.lid-iinan.com を巻き込まないよう注意）
grep -rl 'https://lid-iinan\.com' --include='*.html' --include='*.xml' --include='*.txt' . \
  | xargs sed -i '' 's|https://lid-iinan\.com|https://新しいドメイン|g'
```

### 配信位置について

ドメイン直下（`lid-iinan.com/`）でも、サブディレクトリ（`lid-admin.github.io/corporate/`）でも
動くように、サイト内のリンクはすべて相対パスで書いている。

- **新しく書くリンクは `/` から始めないこと**（`about.html` や `../about.html` のように書く）。
  `/about.html` と書くと、サブディレクトリ配信のときにサイトの外を指してしまう
- `data/news.json` の `url` は `/pages/report.html?id=N` と書いてよい。
  表示するときに、配信位置に合わせて読み替えている（`assets/site.js` の `LID.siteUrl()`）
- `404.html` は、どの階層のURLで表示されても崩れないよう、`<base>` でサイトの起点を固定している

**OGP画像（SNSでURLを共有したときの画像）はドメイン設定後に表示される。**
`og:image` は `https://lid-iinan.com/images/hero.jpg` を指しており、SNSのプレビューは
JavaScriptを実行しないため、配信位置に合わせた読み替えができない。
