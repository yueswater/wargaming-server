#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { io } = require('socket.io-client');

// ─── ANSI ────────────────────────────────────────────────────────────────────
const R  = '\x1b[0m';
const B  = '\x1b[1m';
const D  = '\x1b[2m';
const CY = '\x1b[36m';
const GR = '\x1b[32m';
const YL = '\x1b[33m';
const RD = '\x1b[31m';
const MG = '\x1b[35m';
const BL = '\x1b[34m';
const WH = '\x1b[37m';

// ─── Display helpers ─────────────────────────────────────────────────────────
const ROLE_COLOR = { tsmc: CY, gov: GR, us: BL, thinktank: MG };
const ASCII_TITLE = [
  '____________________   _____  _________  ',
  '\\__    ___/   _____/  /     \\\\ \\_   ___ \\\\ ',
  '  |    |  \\_____  \\\\  /  \\\\ /  \\\\/    \\\\  \\\\/ ',
  '  |    |  /        \\\\/    Y    \\\\     \\\\____',
  '  |____| /_______  /\\\\____|__  /\\\\______  /',
  '                 \\\\/         \\\\/        \\\\/ ',
];
const ROLE_LABELS = {
  zh: { tsmc: '台積電', gov: '行政院', us: '美國政府', thinktank: '智庫  ' },
  en: { tsmc: 'TSMC', gov: 'Cabinet', us: 'U.S.', thinktank: 'Think Tank' },
};
const STRINGS = {
  zh: {
    homeSubtitle: '台積電危機談判模擬',
    homeIntro: '遊戲介紹',
    homeStart: '開始遊戲',
    homeLanguage: '語言設定',
    homeLanguageValue: '中文',
    homeHint: '←/→ 移動，Enter 選擇，Esc 退出',
    introTitle: '遊戲介紹',
    introLines: [
      '四個角色同時提交決策，系統會合併各方立場並解析結果。',
      '台方目標是守住民意與降低攻台機率，美方則追求技術與資金成果。',
      '本地版可單次試玩，也可大量試玩統計勝率。',
    ],
    anyKeyBack: '按任意鍵返回首頁',
    menuHint: '↑/↓ 切換，Enter 確認，Esc 退出',
    modeSelectionTitle: '選擇模式',
    localMode: '本地版',
    webMode: '網頁版',
    localPlayTitle: '本地版玩法',
    singlePlay: '單次試玩',
    singlePlayDetail: '單局完整輸出',
    batchPlay: '大量試玩',
    batchPlayDetail: '批次統計勝率',
    countPrompt: '請輸入試玩次數 (1-10000，直接 Enter = 100)：',
    countError: '[輸入錯誤] 請輸入 1 到 10000 的整數',
    bannerTagline: '台積電危機談判自動驗證',
    modeLabel: '模式',
    playLabel: '玩法',
    serverLabel: '伺服器',
    loginStage: '① 登入帳號',
    socketStage: '② 連接 WebSocket',
    startStage: '③ 開始兵推',
    simulateStage: '④ 模擬開始',
    batchStage: '③ 大量試玩',
    online: '已上線',
    allReady: '全部 {count} 個角色已就位',
    targetRuns: '目標次數：{count}',
    progress: '進度',
    batchStatsTitle: '大量試玩統計',
    tableItem: '項目',
    tableCount: '次數',
    tableRate: '比率',
    taiwanWin: '台方勝利',
    usWin: '美方勝利',
    doubleWin: '雙贏',
    totalElapsed: '總耗時',
    averagePerGame: '平均每局',
    roundPrefix: '第 {round} 輪',
    result: '結果',
    endorsed: '智庫背書',
    notEndorsed: '未背書',
    summaryTitle: '兵推結束',
    finalOpinion: '最終民意',
    finalAttack: '最終攻台機率',
    roundHeader: '回合',
    opinionHeader: '民意',
    attackHeader: '攻台機率',
    resultHeader: '結果',
    overall: '總評',
    finalRoundPassed: '最終回合通過，台灣安全！',
    finalRoundFailed: '最終回合未通過',
    replayPrompt: '按 Y 再玩一次，其他任意鍵退出…',
    resolved: 'resolved',
    collecting: 'collecting',
    weeks: '週',
    years: '年',
    fund: '資金',
    techDemand: '技術需求',
    blackout: '限電',
    techTransfer: '技轉',
    defense: '國防',
    emergencyOrder: '緊急令',
    endorse: '背書',
    signalStrength: '信號強度',
    yes: '是',
    no: '否',
    accept: '接受',
    refuse: '拒絕',
    none: '無',
    negotiated: '協商',
    forced: '強制',
    low: '低',
    medium: '中',
    high: '高',
  },
  en: {
    homeSubtitle: 'TSMC Crisis Negotiation Simulator',
    homeIntro: 'Game Info',
    homeStart: 'Start Game',
    homeLanguage: 'Language',
    homeLanguageValue: 'English',
    homeHint: '←/→ Move, Enter Select, Esc Exit',
    introTitle: 'Game Overview',
    introLines: [
      'Four roles submit decisions at the same time, then the system merges positions and resolves the outcome.',
      'Taiwan aims to protect public support and lower invasion risk, while the U.S. pursues tech and funding gains.',
      'Local mode supports both single-play sessions and large batch simulations for win-rate analysis.',
    ],
    anyKeyBack: 'Press any key to return to the home screen',
    menuHint: '↑/↓ Move, Enter Confirm, Esc Exit',
    modeSelectionTitle: 'Choose Mode',
    localMode: 'Local',
    webMode: 'Web',
    localPlayTitle: 'Local Play',
    singlePlay: 'Single Run',
    singlePlayDetail: 'Full round-by-round output',
    batchPlay: 'Batch Runs',
    batchPlayDetail: 'Bulk win-rate statistics',
    countPrompt: 'Enter number of runs (1-10000, Enter = 100): ',
    countError: '[Invalid input] Enter an integer from 1 to 10000',
    bannerTagline: 'TSMC Crisis Autoplay Validation',
    modeLabel: 'Mode',
    playLabel: 'Play',
    serverLabel: 'Server',
    loginStage: '1. Login Accounts',
    socketStage: '2. Connect WebSocket',
    startStage: '3. Start Wargame',
    simulateStage: '4. Simulation',
    batchStage: '3. Batch Simulation',
    online: 'online',
    allReady: 'All {count} roles are ready',
    targetRuns: 'Target runs: {count}',
    progress: 'Progress',
    batchStatsTitle: 'Batch Simulation Stats',
    tableItem: 'Item',
    tableCount: 'Count',
    tableRate: 'Rate',
    taiwanWin: 'Taiwan Win',
    usWin: 'U.S. Win',
    doubleWin: 'Double Win',
    totalElapsed: 'Elapsed',
    averagePerGame: 'Avg / Game',
    roundPrefix: 'Round {round}',
    result: 'Result',
    endorsed: 'Think Tank Endorsed',
    notEndorsed: 'No Endorsement',
    summaryTitle: 'Simulation Complete',
    finalOpinion: 'Final Opinion',
    finalAttack: 'Final Invasion Risk',
    roundHeader: 'Round',
    opinionHeader: 'Opinion',
    attackHeader: 'Risk',
    resultHeader: 'Result',
    overall: 'Overall',
    finalRoundPassed: 'Final round passed. Taiwan holds.',
    finalRoundFailed: 'Final round failed.',
    replayPrompt: 'Press Y to play again, any other key to exit…',
    resolved: 'resolved',
    collecting: 'collecting',
    weeks: 'w',
    years: 'y',
    fund: 'Fund',
    techDemand: 'Tech Demand',
    blackout: 'Blackout',
    techTransfer: 'Tech',
    defense: 'Defense',
    emergencyOrder: 'Emergency',
    endorse: 'Endorse',
    signalStrength: 'Signal',
    yes: 'Yes',
    no: 'No',
    accept: 'Accept',
    refuse: 'Refuse',
    none: 'None',
    negotiated: 'Negotiated',
    forced: 'Forced',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  },
};
let currentLanguage = 'zh';

function bar(value, max = 100, width = 18) {
  const filled = Math.round((value / max) * width);
  return GR + '█'.repeat(filled) + D + WH + '░'.repeat(Math.max(0, width - filled)) + R;
}
function t(key, replacements = {}) {
  const template = STRINGS[currentLanguage]?.[key] ?? STRINGS.zh[key] ?? key;
  return Object.entries(replacements).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}
function stripAnsi(text) {
  return String(text).replace(/\x1b\[[0-9;]*m/g, '');
}
function displayWidth(text) {
  let width = 0;
  for (const ch of stripAnsi(text)) width += ch.codePointAt(0) > 0x2e7f ? 2 : 1;
  return width;
}
function centerText(text) {
  const columns = process.stdout.columns || 80;
  const padding = Math.max(0, Math.floor((columns - displayWidth(text)) / 2));
  return `${' '.repeat(padding)}${text}`;
}
function printCentered(text = '') {
  console.log(text ? centerText(text) : '');
}
function badge(ok) {
  return ok ? `${B}${GR} PASS ${R}` : `${B}${RD} FAIL ${R}`;
}
function padEnd(str, len) {
  let w = 0;
  for (const ch of str) w += ch.codePointAt(0) > 0x2e7f ? 2 : 1;
  return str + ' '.repeat(Math.max(0, len - w));
}
function header(title) {
  const line = '─'.repeat(50);
  console.log('');
  printCentered(`${CY}${line}${R}`);
  printCentered(`${B}${CY}  ${title}${R}`);
  printCentered(`${CY}${line}${R}`);
}
function divider() {
  printCentered(`${D}${'─'.repeat(50)}${R}`);
}
function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}
function percent(value, total) {
  if (!total) return '0.0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}
function progressBar(current, total, width = 28) {
  const ratio = total <= 0 ? 0 : current / total;
  const filled = Math.round(ratio * width);
  return `${GR}${'█'.repeat(filled)}${D}${WH}${'░'.repeat(Math.max(0, width - filled))}${R}`;
}
function roleLabel(role) {
  return ROLE_LABELS[currentLanguage]?.[role] ?? ROLE_LABELS.zh[role] ?? role;
}
function profileLabel(key) {
  if (key === 'local') return t('localMode');
  if (key === 'web') return t('webMode');
  return key;
}
function formatPayload(role, p) {
  switch (role) {
    case 'tsmc':
      return [
        `${t('blackout')} ${B}${p.tsmcBlackoutWeeks}${R}${t('weeks')}`,
        `${t('techTransfer')} ${B}${p.techTransferPreference}%${R}`,
        `${t('defense')} ${B}${p.tsmcDefensePosition === 'accept' ? t('accept') : t('refuse')}${R}`,
      ].join('  ');
    case 'gov':
      return [
        `${t('blackout')} ${B}${p.governmentBlackoutPreference}${R}${t('weeks')}`,
        `${t('emergencyOrder')} ${B}${p.emergencyOrderIntent ? t('yes') : t('no')}${R}`,
        `${t('defense')} ${B}${t(p.governmentDefensePosition)}${R}`,
      ].join('  ');
    case 'us':
      return [
        `${t('fund')} ${B}$${p.usFund}B${R}`,
        `${currentLanguage === 'en' ? 'Years' : '年數'} ${B}${p.usYears}${R}${t('years')}`,
        `${t('techDemand')} ${B}${p.usTechDemand}%${R}`,
      ].join('  ');
    case 'thinktank':
      return [
        `${t('endorse')} ${B}${p.thinkTankEndorseIntent ? t('yes') : t('no')}${R}`,
        `${t('signalStrength')} ${B}${t(p.policySignalStrength)}${R}`,
      ].join('  ');
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TEMPLATE = {
  defaultMode: 'menu',
  profiles: {
    local: {
      label: '本地版',
      serverUrl: 'http://localhost:3001',
      accounts: {
        tsmc:      { username: 'tsmc',      password: 'FILL_IN' },
        gov:       { username: 'gov',       password: 'FILL_IN' },
        us:        { username: 'us',        password: 'FILL_IN' },
        thinktank: { username: 'thinktank', password: 'FILL_IN' },
      },
    },
    web: {
      label: '網頁版',
      serverUrl: 'https://wargaming.ntun3si.space',
      accounts: {
        tsmc:      { username: 'tsmc',      password: 'FILL_IN' },
        gov:       { username: 'gov',       password: 'FILL_IN' },
        us:        { username: 'us',        password: 'FILL_IN' },
        thinktank: { username: 'thinktank', password: 'FILL_IN' },
      },
    },
  },
};

function loadConfig() {
  // process.pkg is set by @yao-pkg/pkg when running as a packaged binary
  const configDir = process.pkg
    ? path.dirname(process.execPath)
    : __dirname;
  const configPath = path.join(configDir, 'config.json');

  if (!fs.existsSync(configPath)) {
    console.error(`\n${RD}${B}[找不到 config.json]${R}`);
    console.error(`請在執行檔同目錄建立 ${B}config.json${R}，內容範本：\n`);
    console.error(JSON.stringify(TEMPLATE, null, 2));
    console.error(`\n預期路徑：${CY}${configPath}${R}\n`);
    process.exit(1);
  }

  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    console.error(`\n${RD}${B}[config.json 格式錯誤]${R} ${e.message}\n`);
    process.exit(1);
  }

  // Backward-compatible: old single-profile config becomes the web profile.
  if (cfg.serverUrl && cfg.accounts && !cfg.profiles) {
    cfg = {
      defaultMode: 'web',
      profiles: {
        web: {
          label: '網頁版',
          serverUrl: cfg.serverUrl,
          accounts: cfg.accounts,
        },
      },
    };
  }

  const profiles = Object.entries(cfg.profiles || {});
  if (profiles.length === 0) {
    console.error(`\n${RD}${B}[config.json 設定不完整]${R} 缺少 profiles\n`);
    process.exit(1);
  }

  for (const [key, profile] of profiles) {
    const missing = ['tsmc', 'gov', 'us', 'thinktank'].filter(
      (r) => !profile?.accounts?.[r]?.username || !profile?.accounts?.[r]?.password,
    );
    if (!profile?.serverUrl || missing.length) {
      console.error(`\n${RD}${B}[config.json 設定不完整]${R} profile=${key} 缺少：${missing.join(', ') || 'serverUrl'}\n`);
      process.exit(1);
    }
  }

  return cfg;
}

// ─── Network ─────────────────────────────────────────────────────────────────
const ROLES = ['tsmc', 'gov', 'us', 'thinktank'];
let BASE, SOCKET_URL;

async function apiPost(path_, body, token) {
  const res = await fetch(`${BASE}${path_}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`POST ${path_} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function apiGet(path_, token) {
  const res = await fetch(`${BASE}${path_}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GET ${path_} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// ─── Random payloads ─────────────────────────────────────────────────────────
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(...args)     { return args[Math.floor(Math.random() * args.length)]; }

function randomPayload(role) {
  switch (role) {
    case 'tsmc':      return { tsmcBlackoutWeeks: randInt(1,5), techTransferPreference: pick(30,40,50), tsmcDefensePosition: pick('accept','refuse') };
    case 'gov':       return { governmentBlackoutPreference: randInt(1,5), governmentDefensePosition: pick('none','negotiated','forced'), emergencyOrderIntent: pick(true,false) };
    case 'us':        return { usFund: pick(30,40,50,60), usYears: randInt(1,5), usTechDemand: randInt(40,70) };
    case 'thinktank': return { thinkTankEndorseIntent: pick(true,false), policySignalStrength: pick('low','medium','high') };
    default: throw new Error(`Unknown role: ${role}`);
  }
}

// ─── Auth & socket ────────────────────────────────────────────────────────────
async function loginRole(role, cfg) {
  const { username, password } = cfg.accounts[role];
  const { accessToken } = await apiPost('/auth/login', { username, password });
  return { role, username, accessToken };
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    const timer = setTimeout(() => { socket.disconnect(); reject(new Error('socket connect timeout')); }, 10000);
    socket.on('connect',       () => { clearTimeout(timer); resolve(socket); });
    socket.on('connect_error', (e) => { clearTimeout(timer); reject(e); });
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function selectionFallback(fallbackKey, options) {
  if (fallbackKey && options.some((option) => option.key === fallbackKey)) {
    return fallbackKey;
  }
  return options[0].key;
}

function renderHomeScreen(selectedIndex) {
  const options = [
    { key: 'intro', label: t('homeIntro') },
    { key: 'start', label: t('homeStart') },
    { key: 'language', label: `${t('homeLanguage')}：${t('homeLanguageValue')}` },
  ];

  clearScreen();
  console.log('');
  for (const line of ASCII_TITLE) {
    printCentered(`${B}${RD}${line}${R}`);
  }
  console.log('');
  printCentered(`${B}${WH}${t('homeSubtitle')}${R}`);
  console.log('');
  console.log('');

  const row = options.map((option, index) => {
    const active = selectedIndex === index;
    return active
      ? `${B}${WH}[ ${option.label} ]${R}`
      : `${D}${option.label}${R}`;
  }).join('      ');

  printCentered(row);
  console.log('');
  printCentered(`${D}${t('homeHint')}${R}`);
}

function promptHomeScreen() {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    return Promise.resolve('start');
  }

  return new Promise((resolve) => {
    let selectedIndex = 1;

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      process.stdout.write('\n');
    };

    const onData = (buf) => {
      const input = buf.toString('utf8');

      if (input === '\u0003') {
        cleanup();
        process.exit(130);
      }

      if (input === '\u001b') {
        cleanup();
        process.exit(0);
      }

      if (input === '\u001b[D' || input.toLowerCase() === 'h') {
        selectedIndex = selectedIndex === 0 ? 2 : selectedIndex - 1;
        renderHomeScreen(selectedIndex);
        return;
      }

      if (input === '\u001b[C' || input.toLowerCase() === 'l') {
        selectedIndex = selectedIndex === 2 ? 0 : selectedIndex + 1;
        renderHomeScreen(selectedIndex);
        return;
      }

      if (input === '\r' || input === '\n') {
        const picked = ['intro', 'start', 'language'][selectedIndex];
        if (picked === 'language') {
          currentLanguage = currentLanguage === 'zh' ? 'en' : 'zh';
          renderHomeScreen(selectedIndex);
          return;
        }
        cleanup();
        resolve(picked);
      }
    };

    renderHomeScreen(selectedIndex);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

function showIntroScreen() {
  clearScreen();
  console.log('');
  for (const line of ASCII_TITLE) {
    printCentered(`${B}${RD}${line}${R}`);
  }
  console.log('');
  printCentered(`${B}${CY}${t('introTitle')}${R}`);
  divider();
  for (const line of STRINGS[currentLanguage].introLines) {
    printCentered(`${WH}${line}${R}`);
  }
  console.log('');
  printCentered(`${D}${t('anyKeyBack')}${R}`);

  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve();
    });
  });
}

function renderSelectionMenu(title, options, selectedIndex, hint) {
  clearScreen();
  console.log('');
  printCentered(`${B}${CY}╔══════════════════════════════════════════════════╗${R}`);
  printCentered(`${B}${CY}║${R}${B}${padEnd(title, 48)}${CY}║${R}`);
  printCentered(`${B}${CY}╚══════════════════════════════════════════════════╝${R}`);
  for (const option of options) {
    const active = option.index === selectedIndex;
    const pointer = active ? `${YL}❯${R}` : ' ';
    const label = active
      ? `${B}${WH}${option.label}${R}`
      : `${CY}${option.label}${R}`;
    const detail = option.detail
      ? active ? `${WH}${option.detail}${R}` : `${D}${option.detail}${R}`
      : '';
    printCentered(` ${pointer} ${B}${option.index}.${R} ${label}${detail ? `  ${detail}` : ''}`);
  }
  console.log('');
  printCentered(`${D}${hint || t('menuHint')}${R}`);
}

function promptSelectionMenu({ title, options, fallbackKey, hint }) {
  if (options.length === 1) {
    return Promise.resolve(options[0].key);
  }

  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    return Promise.resolve(selectionFallback(fallbackKey, options));
  }

  return new Promise((resolve) => {
    let selectedIndex = Math.max(1, options.findIndex((option) => option.key === selectionFallback(fallbackKey, options)) + 1);

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      process.stdout.write('\n');
    };

    const rerender = () => renderSelectionMenu(title, options, selectedIndex, hint);

    const onData = (buf) => {
      const input = buf.toString('utf8');

      if (input === '\u0003') {
        cleanup();
        process.exit(130);
      }

      if (input === '\u001b') {
        cleanup();
        process.exit(0);
      }

      if (input === '\r' || input === '\n') {
        const picked = options[selectedIndex - 1] || options[0];
        cleanup();
        resolve(picked.key);
        return;
      }

      if (input === '\u001b[A' || input.toLowerCase() === 'k') {
        selectedIndex = selectedIndex === 1 ? options.length : selectedIndex - 1;
        rerender();
        return;
      }

      if (input === '\u001b[B' || input.toLowerCase() === 'j') {
        selectedIndex = selectedIndex === options.length ? 1 : selectedIndex + 1;
        rerender();
      }
    };

    renderSelectionMenu(title, options, selectedIndex, hint);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

function promptModeSelection(cfg) {
  const profiles = Object.entries(cfg.profiles || {}).map(([key, profile], index) => ({
    key,
    label: profileLabel(key),
    detail: profile.serverUrl,
    index: index + 1,
  }));

  return promptSelectionMenu({
    title: `                  ${t('modeSelectionTitle')}`,
    options: profiles,
    fallbackKey: cfg.defaultMode && cfg.defaultMode !== 'menu' ? cfg.defaultMode : null,
  });
}

function promptLocalPlayMode() {
  return promptSelectionMenu({
    title: `                ${t('localPlayTitle')}`,
    options: [
      { key: 'single', label: t('singlePlay'), detail: t('singlePlayDetail'), index: 1 },
      { key: 'batch', label: t('batchPlay'), detail: t('batchPlayDetail'), index: 2 },
    ],
    fallbackKey: 'single',
  });
}

async function promptBatchCount() {
  if (!process.stdin.isTTY) return 100;

  while (true) {
    clearScreen();
    console.log('');
    printCentered(`${B}${CY}╔══════════════════════════════════════════════════╗${R}`);
    printCentered(`${B}${CY}║${R}${B}${padEnd(`  ${t('batchPlay')}`, 48)}${CY}║${R}`);
    printCentered(`${B}${CY}╚══════════════════════════════════════════════════╝${R}`);
    console.log('');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => {
      rl.question(`\n  ${t('countPrompt')}`, (value) => {
        rl.close();
        resolve(value.trim());
      });
    });

    if (!answer) return 100;

    const count = Number(answer);
    if (Number.isInteger(count) && count >= 1 && count <= 10000) {
      return count;
    }

    printCentered(`${RD}${t('countError')}${R}`);
  }
}

function promptReplay() {
  return new Promise((resolve) => {
    process.stdout.write(`\n${centerText(t('replayPrompt').replace('Y', `${B}${CY}Y${R}`))}  `);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', (buf) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      const ch = buf.toString().toLowerCase();
      process.stdout.write('\n');
      resolve(ch === 'y');
    });
  });
}

function printBanner(profile, selectedMode, localPlayMode, batchCount) {
  console.log('');
  for (const line of ASCII_TITLE) {
    printCentered(`${B}${RD}${line}${R}`);
  }
  printCentered(`${D}${t('bannerTagline')}${R}`);
  console.log('');
  printCentered(`${YL}${t('modeLabel')}：${profileLabel(selectedMode)}${R}`);
  if (selectedMode === 'local') {
    printCentered(`${D}${t('playLabel')}：${localPlayMode === 'batch' ? `${t('batchPlay')} x ${batchCount}` : t('singlePlay')}${R}`);
  }
  printCentered(`${D}${t('serverLabel')}：${profile.serverUrl.replace(/\/$/, '')}${R}`);
}

function getFinalRoundSummary(game) {
  const history = game?.aggregateState?.roundHistory || [];
  return history[history.length - 1] || null;
}

async function waitForRoundResult(gameId, roundNum, token, retries = 20, delayMs = 500) {
  let updated = null;
  for (let i = 0; i < retries; i++) {
    await sleep(delayMs);
    updated = await apiGet(`/games/${gameId}`, token);
    const round = updated.rounds.find((r) => r.roundNumber === roundNum);
    if (round?.phase === 'resolved' || updated.status !== 'active' || updated.currentRoundNumber > roundNum) {
      return updated;
    }
  }
  return updated || apiGet(`/games/${gameId}`, token);
}

async function loginAllRoles(profile) {
  return Promise.all(ROLES.map((r) => loginRole(r, profile)));
}

async function connectAllSockets(accounts) {
  return Promise.all(accounts.map(({ accessToken }) => connectSocket(accessToken)));
}

async function startGameForAccounts(accounts) {
  const host = accounts.find((account) => account.role === 'tsmc');
  return apiPost('/games/start', {}, host.accessToken);
}

async function playSingleGame(accounts, { verbose = true, minDelayMs = 0, maxDelayMs = 0, pollDelayMs = 500 } = {}) {
  let game = await startGameForAccounts(accounts);
  const host = accounts.find((account) => account.role === 'tsmc');

  if (verbose) {
    printCentered(`${GR}✓${R}  ${B}${game.name}${R}`);
    printCentered(`${D}ID: ${game.id}${R}`);
    header(t('simulateStage'));
  }

  while (game.status === 'active') {
    const roundNum = game.currentRoundNumber;

    if (verbose) {
      console.log('');
      printCentered(`${B}${YL}▶ ${t('roundPrefix', { round: roundNum })}${R}`);
      divider();
    }

    await Promise.all(
      accounts.map(async ({ role, accessToken }) => {
        const delay = maxDelayMs > 0 ? randInt(minDelayMs, maxDelayMs) : 0;
        if (delay > 0) await sleep(delay);

        const payload = randomPayload(role);
        const result = await apiPost(
          `/games/${game.id}/rounds/${roundNum}/submissions`,
          { gameRole: role, payload },
          accessToken,
        );

        if (verbose) {
          const phaseTag = result.phase === 'resolved' ? `${GR}${t('resolved')}${R}` : `${YL}${t(result.phase)}${R}`;
          printCentered(`${GR}✓${R}  ${ROLE_COLOR[role]}${B}${padEnd(roleLabel(role), 10)}${R}  ${formatPayload(role, payload)}  ${D}(${(delay/1000).toFixed(1)}s)${R}  → ${phaseTag}`);
        }
      }),
    );

    game = await waitForRoundResult(game.id, roundNum, host.accessToken, 40, pollDelayMs);

    if (verbose) {
      const round = game.rounds.find((r) => r.roundNumber === roundNum);
      if (round?.result) {
        const r = round.result;
        divider();
        printCentered(
          `  ${B}${t('result')}${R}  ` +
          `${t('opinionHeader')} ${B}${YL}${r.finalOpinion}${R} ${bar(r.finalOpinion)}  ` +
          `${t('attackHeader')} ${B}${r.finalAttack <= 50 ? GR : RD}${r.finalAttack}${R} ${bar(r.finalAttack)}  ` +
          `${r.thinkTankEndorsed ? `${MG}${t('endorsed')}${R}` : `${D}${t('notEndorsed')}${R}`}  ` +
          badge(r.allOk),
        );
      }
    }
  }

  return game;
}

function renderBatchProgress(current, total) {
  process.stdout.write(`\r\x1b[2K${centerText(`${B}${t('progress')}${R} ${progressBar(current, total)} ${B}${current}/${total}${R} ${D}(${percent(current, total)})${R}`)}`);
}

function printBatchStats(total, stats, elapsedMs) {
  const elapsedSec = elapsedMs / 1000;
  const averageMs = total > 0 ? elapsedMs / total : 0;

  console.log('');
  printCentered(`${B}${CY}╔══════════════════════════════════════════════════╗${R}`);
  printCentered(`${B}${CY}║${R}${B}${padEnd(`  ${t('batchStatsTitle')}`, 48)}${CY}║${R}`);
  printCentered(`${B}${CY}╚══════════════════════════════════════════════════╝${R}`);
  console.log('');
  printCentered(`${D}${padEnd(t('tableItem'), 12)}${padEnd(t('tableCount'), 8)}${t('tableRate')}${R}`);
  printCentered(`${D}${'─'.repeat(34)}${R}`);
  printCentered(`${padEnd(t('taiwanWin'), 12)}${padEnd(String(stats.taiwanWins), 8)}${B}${percent(stats.taiwanWins, total)}${R}`);
  printCentered(`${padEnd(t('usWin'), 12)}${padEnd(String(stats.usWins), 8)}${B}${percent(stats.usWins, total)}${R}`);
  printCentered(`${padEnd(t('doubleWin'), 12)}${padEnd(String(stats.doubleWins), 8)}${B}${percent(stats.doubleWins, total)}${R}`);
  console.log('');
  printCentered(`${D}${t('totalElapsed')}：${R}${B}${elapsedSec.toFixed(2)}s${R}   ${D}${t('averagePerGame')}：${R}${B}${averageMs.toFixed(1)}ms${R}`);
  console.log('');
}

async function runBatchGames(accounts, count) {
  const stats = { taiwanWins: 0, usWins: 0, doubleWins: 0 };
  const startedAt = Date.now();

  header(t('batchStage'));
  printCentered(`${D}${t('targetRuns', { count })}${R}`);
  console.log('');

  for (let i = 1; i <= count; i++) {
    const game = await playSingleGame(accounts, {
      verbose: false,
      minDelayMs: 0,
      maxDelayMs: 0,
      pollDelayMs: 80,
    });

    const finalRound = getFinalRoundSummary(game);
    const taiwanWin = Boolean(finalRound?.allOk);
    const usWin = Boolean(finalRound?.usVictoryOk);
    const doubleWin = taiwanWin && usWin;

    if (taiwanWin) stats.taiwanWins += 1;
    if (usWin) stats.usWins += 1;
    if (doubleWin) stats.doubleWins += 1;

    renderBatchProgress(i, count);
  }

  const elapsedMs = Date.now() - startedAt;
  process.stdout.write('\n');
  printBatchStats(count, stats, elapsedMs);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const cfg = loadConfig();
  while (true) {
    const homeAction = await promptHomeScreen();
    if (homeAction === 'start') break;
    await showIntroScreen();
  }
  const selectedMode = await promptModeSelection(cfg);
  const profile = cfg.profiles[selectedMode];
  const localPlayMode = selectedMode === 'local'
    ? await promptLocalPlayMode()
    : 'single';
  const batchCount = localPlayMode === 'batch'
    ? await promptBatchCount()
    : null;

  // Derive URLs from config
  const base = profile.serverUrl.replace(/\/$/, '');
  SOCKET_URL = base;
  BASE       = base + '/api';
  let exitCode = 0;

  // ① Login
  clearScreen();
  printBanner(profile, selectedMode, localPlayMode, batchCount);
  header(t('loginStage'));
  const accounts = await loginAllRoles(profile);
  for (const { role, username } of accounts) {
    printCentered(`${GR}✓${R}  ${ROLE_COLOR[role]}${B}${padEnd(roleLabel(role), 10)}${R}  ${D}${username}${R}`);
  }

  // ② Sockets
  clearScreen();
  printBanner(profile, selectedMode, localPlayMode, batchCount);
  header(t('socketStage'));
  const sockets = await connectAllSockets(accounts);
  for (const { role } of accounts) {
    printCentered(`${GR}✓${R}  ${ROLE_COLOR[role]}${B}${roleLabel(role)}${R}  ${t('online')}`);
  }
  await sleep(400);
  console.log('');
  printCentered(`${GR}${B}${t('allReady', { count: sockets.length })}${R}`);

  if (localPlayMode === 'batch') {
    clearScreen();
    printBanner(profile, selectedMode, localPlayMode, batchCount);
    await runBatchGames(accounts, batchCount);
  } else {
    // ③ Start game / ④ Rounds
    clearScreen();
    printBanner(profile, selectedMode, localPlayMode, batchCount);
    header(t('startStage'));
    const game = await playSingleGame(accounts, {
      verbose: true,
      minDelayMs: 0,
      maxDelayMs: 5000,
      pollDelayMs: 500,
    });

    // ── Summary ──
    const { opinion, attackProb, roundHistory } = game.aggregateState;
    const finalRound = getFinalRoundSummary(game);
    const allPassed = Boolean(finalRound?.allOk);
    exitCode = allPassed ? 0 : 1;

    console.log('');
    printCentered(`${B}${CY}╔══════════════════════════════════════════════════╗${R}`);
    printCentered(`${B}${CY}║${R}${B}${padEnd(`  ${t('summaryTitle')}`, 48)}${CY}║${R}`);
    printCentered(`${B}${CY}╚══════════════════════════════════════════════════╝${R}`);
    console.log('');
    printCentered(`${B}${padEnd(t('finalOpinion'), 12)}${R}  ${B}${YL}${opinion}${R}  ${bar(opinion)}`);
    printCentered(`${B}${padEnd(t('finalAttack'), 12)}${R}  ${B}${attackProb <= 50 ? GR : RD}${attackProb}${R}  ${bar(attackProb)}`);
    console.log('');
    printCentered(`${D}${padEnd(t('roundHeader'), 8)}${padEnd(t('opinionHeader'), 8)}${padEnd(t('attackHeader'), 10)}${t('resultHeader')}${R}`);
    printCentered(`${D}${'─'.repeat(32)}${R}`);
    for (const h of roundHistory) {
      printCentered(`${padEnd(t('roundPrefix', { round: h.roundNumber }), 12)}${padEnd(String(h.finalOpinion), 8)}${padEnd(String(h.finalAttack), 10)}${h.allOk ? `${GR}✓ PASS${R}` : `${RD}✗ FAIL${R}`}`);
    }
    console.log('');
    printCentered(`${t('overall')}  ${badge(allPassed)}  ${allPassed ? `${GR}${t('finalRoundPassed')}${R}` : `${RD}${t('finalRoundFailed')}${R}`}`);
    console.log('');
  }

  const again = await promptReplay();
  for (const s of sockets) s.disconnect();

  if (again) {
    process.stdout.write('\x1b[2J\x1b[H');
    await main();
  } else {
    process.exit(exitCode);
  }
}

main().catch((err) => {
  const msg = err.message || String(err);
  if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
    console.error(`\n${RD}${B}[連線失敗]${R}${RD} 無法連到伺服器，請確認 config.json 的 serverUrl 正確${R}\n`);
  } else {
    console.error(`\n${RD}${B}[自動驗證失敗]${R}${RD} ${msg}${R}\n`);
  }
  process.exit(1);
});
