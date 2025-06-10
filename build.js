require('dotenv').config();
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['script.js'],
  bundle: true,
  outfile: 'dist/bundle.js',
  define: {
    'process.env.DEEPSEEK_API_KEY': `"${process.env.DEEPSEEK_API_KEY}"`
  },
  loader: {
    '.js': 'jsx'
  }
}).catch(() => process.exit(1));
