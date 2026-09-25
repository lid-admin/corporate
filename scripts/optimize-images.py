#!/usr/bin/env python3
"""活動レポート用の画像を、掲載に適したサイズへ縮小する。

対象は images/ 内の「番号-連番」形式のファイルのみ（例: 16-1.jpg）。
hero.jpg・ロゴ・ファビコン・メンバー写真などは対象外。

  ./scripts/optimize-images.py                 何が起きるか確認する（書き換えない）
  ./scripts/optimize-images.py --apply         実行する
  ./scripts/optimize-images.py --apply --backup ../backup-images

守っていること:

- **縦横比は変えない。** 長辺が上限を超える場合だけ、比率を保って縮める。
- **拡大しない。** 上限より小さい画像はそのままの寸法で扱う。
- **元より大きくなる場合は書き換えない。** 画質を落として容量が増えるのを避ける。
- **確認が既定。** --apply を付けない限りファイルには触れない。

必要なもの: Python 3 と Pillow（`python3 -m pip install Pillow`）。
macOS 標準の sips でも縮小はできるが、JPEG の符号化が弱く、
すでに圧縮済みの画像では縮小しても容量が増えることが多い。
"""

import argparse
import io
import os
import re
import shutil
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow が必要です:  python3 -m pip install Pillow")

# レポート用画像のファイル名（例: 1-1.jpg, 16-3.jpeg）
REPORT_IMAGE = re.compile(r'^\d{1,3}-\d+\.(jpg|jpeg)$', re.IGNORECASE)


def human(n):
    return f"{n / 1024:,.0f}KB" if n < 1024 * 1024 else f"{n / 1048576:.1f}MB"


def encode(img, quality):
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=quality, optimize=True, progressive=True)
    return buf.getvalue()


def main():
    p = argparse.ArgumentParser(
        description='活動レポート用の画像を縮小する',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='対象: images/ の「番号-連番」形式のみ（例: 1-1.jpg）')
    p.add_argument('--apply', action='store_true',
                   help='実際にファイルを書き換える（既定は確認のみ）')
    p.add_argument('--max', type=int, default=1600, metavar='PX',
                   help='長辺の上限。既定 1600（サイト上の最大表示は約1200px）')
    p.add_argument('--quality', type=int, default=82, metavar='N',
                   help='JPEG品質 1-100。既定 82')
    p.add_argument('--budget', type=int, default=250, metavar='KB',
                   help='これ以下のファイルには手を付けない。既定 250')
    p.add_argument('--dir', default='images', metavar='PATH',
                   help='対象ディレクトリ。既定 images')
    p.add_argument('--backup', metavar='PATH',
                   help='書き換え前に元ファイルをここへ複製する')
    args = p.parse_args()

    if not os.path.isdir(args.dir):
        sys.exit(f"ディレクトリがありません: {args.dir}")
    if args.apply and args.backup:
        os.makedirs(args.backup, exist_ok=True)

    names = sorted(
        (n for n in os.listdir(args.dir) if REPORT_IMAGE.match(n)),
        key=lambda n: [int(x) for x in re.findall(r'\d+', n)])

    print(f"対象ディレクトリ : {args.dir}")
    print(f"長辺の上限       : {args.max}px")
    print(f"JPEG品質         : {args.quality}")
    print(f"手を付けない基準 : {args.budget}KB 以下")
    print("モード           : " + ("実行（ファイルを書き換えます）" if args.apply
                                   else "確認のみ（--apply で実行）"))
    if args.apply and args.backup:
        print(f"元ファイルの保存 : {args.backup}")
    print()
    print(f"{'ファイル':<13}{'元の寸法':>12}{'サイズ':>10}   {'変更後':>12}{'サイズ':>10}   結果")
    print("─" * 88)

    before_total = after_total = 0
    n_resized = n_skipped = n_kept = 0

    for name in names:
        path = os.path.join(args.dir, name)
        before = os.path.getsize(path)
        before_total += before

        try:
            img = Image.open(path)
        except Exception as e:
            print(f"{name:<13}{'—':>12}{'—':>10}   {'—':>12}{'—':>10}   読み込み失敗: {e}")
            after_total += before
            continue

        w, h = img.size

        # すでに十分小さいものには触れない
        if before <= args.budget * 1024:
            print(f"{name:<13}{f'{w}x{h}':>12}{human(before):>10}   {'—':>12}{'—':>10}   "
                  f"対象外（{human(before)}は基準内）")
            after_total += before
            n_skipped += 1
            continue

        # EXIF の向きを反映してから縮小する（回転した写真が横倒しになるのを防ぐ）
        img = ImageOps.exif_transpose(img)
        img = img.convert('RGB')
        # thumbnail は縦横比を保ち、上限より小さい画像を拡大しない
        img.thumbnail((args.max, args.max), Image.LANCZOS)
        nw, nh = img.size

        data = encode(img, args.quality)
        after = len(data)

        # 小さくならないなら書き換えない
        if after >= before:
            print(f"{name:<13}{f'{w}x{h}':>12}{human(before):>10}   "
                  f"{f'{nw}x{nh}':>12}{human(after):>10}   縮まないため据え置き")
            after_total += before
            n_kept += 1
            continue

        pct = 100 - after * 100 // before
        note = f"{pct}% 削減"
        if (w, h) == (nw, nh):
            note += "（寸法は変更なし）"
        print(f"{name:<13}{f'{w}x{h}':>12}{human(before):>10}   "
              f"{f'{nw}x{nh}':>12}{human(after):>10}   {note}")

        after_total += after
        n_resized += 1

        if args.apply:
            if args.backup:
                shutil.copy2(path, os.path.join(args.backup, name))
            with open(path, 'wb') as f:
                f.write(data)

    print("─" * 88)
    print()
    print(f"縮小 {n_resized}枚 / 対象外 {n_skipped}枚 / 据え置き {n_kept}枚")
    if before_total:
        pct = 100 - after_total * 100 / before_total
        print(f"合計 {human(before_total)} → {human(after_total)} （{pct:.0f}% 削減）")

    if n_kept:
        print()
        print("「据え置き」は縮小しても元より小さくならなかったものです。")
        print("元がすでに強く圧縮されている場合に起きます。")

    if not args.apply and n_resized:
        print()
        print("書き換えていません。実行するには --apply を付けてください。")
        print("元に戻せないため、心配な場合は --backup で元ファイルを残せます。")
        print("  ./scripts/optimize-images.py --apply --backup ../backup-images")


if __name__ == '__main__':
    main()
