require('dotenv').config();
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// 確保 dist 目錄存在
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// 處理 index.html：讀取、修改路徑並寫入 dist
let indexContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
// 這個正則表達式會找到 href="..." 或 src="..." 中的路徑，
// 並移除所有路徑前綴 (如 ./, dist/, ./dist/)，只留下檔案名稱。
indexContent = indexContent.replace(/(href|src)="\.\/(dist\/)?/g, '$1="');
fs.writeFileSync(path.join(distDir, 'index.html'), indexContent);

// 複製其他必要的根目錄檔案到 dist
fs.copyFileSync(path.join(__dirname, 'AestheticFluidBg.min.js'), path.join(distDir, 'AestheticFluidBg.min.js'));
fs.copyFileSync(path.join(__dirname, 'favicon.svg'), path.join(distDir, 'favicon.svg'));


async function buildAndEmbed() {
  try {
    // 執行 esbuild
    await esbuild.build({
      entryPoints: ['script.js'],
      bundle: true,
      outfile: 'dist/bundle.js',
      loader: {
        '.js': 'jsx'
      }
    });

    // 讀取 dist 目錄下的所有檔案
    const staticAssets = {};
    const distFiles = fs.readdirSync(distDir);

    for (const file of distFiles) {
      const filePath = path.join(distDir, file);
      const fileContent = fs.readFileSync(filePath);
      const key = `/speedreader/${file}`; // 根據 worker 中的路由邏輯設定 key

      let mimeType = 'application/octet-stream';
      if (file.endsWith('.html')) mimeType = 'text/html; charset=utf-8';
      else if (file.endsWith('.css')) mimeType = 'text/css; charset=utf-8';
      else if (file.endsWith('.js')) mimeType = 'application/javascript; charset=utf-8';
      else if (file.endsWith('.svg')) mimeType = 'image/svg+xml';

      // 將檔案內容轉為 Base64，以便儲存在 JS 檔案中
      staticAssets[key] = {
        content: fileContent.toString('base64'),
        mimeType: mimeType
      };
    }

    // 將靜態資源物件轉換為 JSON 字串
    const assetsJsonString = `const staticAssets = ${JSON.stringify(staticAssets, null, 2)};`;
    
    // 讀取 worker 模板
    const workerTemplate = fs.readFileSync(path.join(__dirname, 'worker-template.js'), 'utf-8');
    
    // 將靜態資源注入模板
    const finalWorkerContent = workerTemplate.replace(
      '// STATIC_ASSETS_PLACEHOLDER',
      assetsJsonString
    );

    fs.writeFileSync(path.join(__dirname, 'worker.js'), finalWorkerContent);

    console.log('Build complete and static assets embedded into worker.js');

  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildAndEmbed();
