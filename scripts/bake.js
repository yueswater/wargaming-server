#!/usr/bin/env node
'use strict';
/**
 * 將 autoplay-standalone.js 的 loadConfig() 替換成硬編碼設定，
 * 輸出 _baked_entry.js 供 pkg 打包。
 * 打包完成後此暫存檔應立即刪除。
 */
require('dotenv').config({ path: __dirname + '/../.env', quiet: true });

const fs   = require('fs');
const path = require('path');

const get = (key) => {
  const v = process.env[key];
  if (!v) { console.error(`Missing env var: ${key}`); process.exit(1); }
  return v;
};

const config = {
  serverUrl: 'https://wargaming.ntun3si.space',
  accounts: {
    tsmc:      { username: get('ROLE_TSMC_USERNAME'),      password: get('ROLE_TSMC_PASSWORD') },
    gov:       { username: get('ROLE_GOV_USERNAME'),       password: get('ROLE_GOV_PASSWORD') },
    us:        { username: get('ROLE_US_USERNAME'),        password: get('ROLE_US_PASSWORD') },
    thinktank: { username: get('ROLE_THINKTANK_USERNAME'), password: get('ROLE_THINKTANK_PASSWORD') },
  },
};

const srcPath = path.join(__dirname, 'autoplay-standalone.js');
const outPath = path.join(__dirname, '_baked_entry.js');

let src = fs.readFileSync(srcPath, 'utf-8');

// Replace the entire Config section (between the two section markers) with
// a baked loadConfig() that just returns the hardcoded object.
const bakedSection =
  `// ─── Config (baked at build time) ───────────────────────────────────────────\n` +
  `function loadConfig() {\n` +
  `  return ${JSON.stringify(config, null, 2)};\n` +
  `}\n`;

const replaced = src.replace(
  /\/\/ ─── Config [\s\S]*?(?=\/\/ ─── Network)/,
  bakedSection + '\n',
);

if (replaced === src) {
  console.error('Error: could not find Config section in autoplay-standalone.js');
  process.exit(1);
}

fs.writeFileSync(outPath, replaced);
console.log(`✓ 產出 ${path.basename(outPath)}`);
