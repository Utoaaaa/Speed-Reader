# Speed-Reader

Speed-Reader 是一個現代化的網頁速度閱讀工具，支援美學流體背景、Tailwind CSS 樣式，並可部署於 Cloudflare Workers。

## 功能特色

- 速度閱讀介面，提升閱讀效率
- 美學流體背景效果（AestheticFluidBg）
- 響應式設計，支援多裝置
- Tailwind CSS 快速樣式開發
- Cloudflare Workers 部署支援

## 技術棧

- HTML、CSS、JavaScript
- Tailwind CSS
- PostCSS
- Cloudflare Workers

## 安裝與啟動

1. 安裝依賴套件
   ```bash
   pnpm install
   ```
2. 本地開發
   ```bash
   pnpm run dev
   ```
3. 建置專案
   ```bash
   pnpm run build
   ```

## 部署至 Cloudflare Workers

1. 設定 `wrangler.toml`
2. 使用 Wrangler 部署
   ```bash
   pnpm run deploy
   ```

## 檔案結構

- `index.html`：主頁
- `style.css`：自訂樣式
- `script.js`：前端邏輯
- `AestheticFluidBg.min.js`：流體背景特效
- `worker-template.js`：Cloudflare Worker 範本
- `build.js`：建置腳本
- `tailwind.config.js`、`postcss.config.js`：樣式設定
- `wrangler.toml`：Cloudflare Workers 設定

## 授權

MIT License
