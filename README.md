# English Arena

一個英文學習挑戰遊戲，使用純 JavaScript、CSS 和 HTML 構建。

## 功能

- 中翻英測驗
- 限時拼字挑戰
- 練習模式和對戰模式
- 全球排行榜（需要 Firebase）

## 設置

1. 克隆或下載文件。
2. 在 `index.html` 中替換 Firebase 配置：
   ```javascript
   window.__firebase_config = '{"apiKey":"your-api-key","authDomain":"your-project.firebaseapp.com","projectId":"your-project","storageBucket":"your-project.appspot.com","messagingSenderId":"123456789","appId":"1:123456789:web:abcdef"}';
   ```
3. 運行本地服務器：
   ```bash
   python -m http.server 8000
   ```
4. 在瀏覽器中打開 `http://localhost:8000`。

## Firebase 設置

1. 在 Firebase 控制台創建項目。
2. 啟用 Authentication 和 Firestore。
3. 複製配置到 `index.html`。

## 文件結構

- `index.html`: 主 HTML 文件
- `styles.css`: CSS 樣式
- `app.js`: JavaScript 邏輯