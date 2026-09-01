# TETORICA COLORS

画面にかざして、色を読むためのカラーレンズです。

`tetorica-colors` は、透明なウィンドウを他のアプリの上に置き、気になる範囲をドラッグするだけで色を分析します。画像ファイルの読み込みにも対応しています。

## Concept

デッサン用グリッドや計測機能は持ちません。色の収集と分析に集中した、軽量なカラーパレットツールです。

1. 対象を画面または画像から選ぶ
2. 色を知りたい範囲をドラッグする
3. 色相・彩度または色相・明度の分布を確認する
4. パレットを書き出す

## Features

- 画面上の任意領域を色分析
- 画像ファイルからの色分析
- 主要色と近似色の抽出
- 色相・彩度 / 色相・明度チャート
- PNG、CSV、Procreate Swatches (`.swatches`) の書き出し
- 常に前面表示とクリック透過

## Usage

通常は `Screen` モードで起動します。他のアプリの上にウィンドウを置き、分析したい範囲をドラッグします。

`Import image` で画像を読み込むと、自動的に `Image` モードへ切り替わります。画像を消すと、デスクトップ版では `Screen` モードに戻ります。

分析結果が表示されたら、下部のツールバーから表示軸の切替、書き出し、結果の消去を行えます。

macOSで画面分析を使うには、システム設定の「プライバシーとセキュリティ」で画面収録を許可してください。

## Development

Requirements: Node.js and Rust (Tauri v2 development environment)

```bash
npm install
npm run tauri:dev
```

Production build:

```bash
npm run build
npm run tauri build
```

Web build:

```bash
npm run build:web
```

Web版ではブラウザの制約により、画面の直接分析や常に前面表示など一部のデスクトップ機能を利用できません。

## Tech

- Tauri v2
- React + TypeScript
- Canvas API
- Rust image analysis

## License

MIT
