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
indexContent = indexContent.replace(/href="dist\//g, 'href="').replace(/src="dist\//g, 'src="');
fs.writeFileSync(path.join(distDir, 'index.html'), indexContent);

// 複製其他必要的根目錄檔案到 dist
fs.copyFileSync(path.join(__dirname, 'AestheticFluidBg.min.js'), path.join(distDir, 'AestheticFluidBg.min.js'));
fs.copyFileSync(path.join(__dirname, 'favicon.svg'), path.join(distDir, 'favicon.svg'));


esbuild.build({
  entryPoints: ['script.js'],
  bundle: true,
  outfile: 'dist/bundle.js',
  loader: {
    '.js': 'jsx'
  }
}).catch(() => process.exit(1));
