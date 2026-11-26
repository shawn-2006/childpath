# 童路 ChildPath｜GitHub Pages 上線與持續更新指南

本資料夾為**純靜態網站**，所有路徑皆為相對路徑，已備妥 `.nojekyll` 與 `.github/workflows/deploy-pages.yml`，可直接推送到 GitHub 並透過 GitHub Pages 上線。

## 一、首次上線到 GitHub Pages

1. 在 GitHub 建立新 Repository（例如 `childpath`）。
2. 將本資料夾內容推送到 `main` 分支：
   ```sh
   git init
   git add .
   git commit -m "feat: initial ChildPath site"
   git branch -M main
   git remote add origin https://github.com/<你的帳號>/<你的repo>.git
   git push -u origin main
   ```
3. 到 GitHub Repository 的 **Settings → Pages → Build and deployment**：
   - Source 選擇 **GitHub Actions**。
   - 幾十秒後即可透過 `https://<你的帳號>.github.io/<你的repo>/` 瀏覽。

## 二、未來如何持續更新網站

### 情境 A：新增或修改機構資料
1. 編輯 `data/services.min.json` 中的 `items` 陣列（每筆須包含 `id`、`name`、`county`、`category`、`age_status`、`services_summary`、`official_url`，以及 `has_free_service`、`ownership`、`l1_tags`、`l2_tags`）。
2. 執行資料驗證與同步腳本：
   ```sh
   python3 scripts/build_data.py
   ```
   腳本會檢查必填欄位與重複 ID、自動更新 `generated_at` 日期，並同步重新產生 `data/offline.js`。
3. `git commit` 並 `git push`，GitHub Actions 會自動重新部署；前端已設定 `cache: 'no-cache'`，訪客重整即可看到最新資料與頁尾更新日期。
