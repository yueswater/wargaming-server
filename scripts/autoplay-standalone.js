#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
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
const ROLE_CN    = { tsmc: '台積電', gov: '行政院', us: '美國政府', thinktank: '智庫  ' };
const ROLE_COLOR = { tsmc: CY, gov: GR, us: BL, thinktank: MG };

function bar(value, max = 100, width = 18) {
  const filled = Math.round((value / max) * width);
  return GR + '█'.repeat(filled) + D + WH + '░'.repeat(Math.max(0, width - filled)) + R;
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
  console.log(`\n${CY}${line}${R}`);
  console.log(`${B}${CY}  ${title}${R}`);
  console.log(`${CY}${line}${R}`);
}
function divider() {
  console.log(`${D}${'─'.repeat(50)}${R}`);
}
function formatPayload(role, p) {
  switch (role) {
    case 'tsmc':
      return [`限電 ${B}${p.tsmcBlackoutWeeks}${R}週`, `技轉 ${B}${p.techTransferPreference}%${R}`, `國防 ${B}${p.tsmcDefensePosition === 'accept' ? '接受' : '拒絕'}${R}`].join('  ');
    case 'gov':
      return [`限電 ${B}${p.governmentBlackoutPreference}${R}週`, `緊急令 ${B}${p.emergencyOrderIntent ? '是' : '否'}${R}`, `國防 ${B}${{ none:'無', negotiated:'協商', forced:'強制' }[p.governmentDefensePosition]}${R}`].join('  ');
    case 'us':
      return [`資金 ${B}$${p.usFund}B${R}`, `年數 ${B}${p.usYears}${R}年`, `技術需求 ${B}${p.usTechDemand}%${R}`].join('  ');
    case 'thinktank':
      return [`背書 ${B}${p.thinkTankEndorseIntent ? '是' : '否'}${R}`, `信號強度 ${B}${{ low:'低', medium:'中', high:'高' }[p.policySignalStrength]}${R}`].join('  ');
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TEMPLATE = {
  serverUrl: 'https://wargaming.ntun3si.space',
  accounts: {
    tsmc:      { username: 'tsmc',      password: 'FILL_IN' },
    gov:       { username: 'gov',       password: 'FILL_IN' },
    us:        { username: 'us',        password: 'FILL_IN' },
    thinktank: { username: 'thinktank', password: 'FILL_IN' },
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

  const missing = ['tsmc', 'gov', 'us', 'thinktank'].filter(
    (r) => !cfg.accounts?.[r]?.username || !cfg.accounts?.[r]?.password,
  );
  if (!cfg.serverUrl || missing.length) {
    console.error(`\n${RD}${B}[config.json 設定不完整]${R} 缺少：${missing.join(', ') || 'serverUrl'}\n`);
    process.exit(1);
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

function promptReplay() {
  return new Promise((resolve) => {
    process.stdout.write(`\n  Press ${B}${CY}Y${R} to play again, any other key to exit…  `);
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

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const cfg = loadConfig();

  // Derive URLs from config
  const base = cfg.serverUrl.replace(/\/$/, '');
  SOCKET_URL = base;
  BASE       = base + '/api';

  // ── Banner ──
  console.log('');
  console.log(`${B}${CY}╔══════════════════════════════════════════════════╗${R}`);
  console.log(`${B}${CY}║${R}${B}        兵推自動驗證腳本  TSMC Crisis Autoplay     ${CY}║${R}`);
  console.log(`${B}${CY}╚══════════════════════════════════════════════════╝${R}`);
  console.log(`  ${D}伺服器：${base}${R}`);

  // ① Login
  header('① 登入帳號');
  const accounts = await Promise.all(ROLES.map((r) => loginRole(r, cfg)));
  for (const { role, username } of accounts) {
    console.log(`  ${GR}✓${R}  ${ROLE_COLOR[role]}${B}${padEnd(ROLE_CN[role], 6)}${R}  ${D}${username}${R}`);
  }

  // ② Sockets
  header('② 連接 WebSocket');
  const sockets = await Promise.all(accounts.map(({ accessToken }) => connectSocket(accessToken)));
  for (const { role } of accounts) {
    console.log(`  ${GR}✓${R}  ${ROLE_COLOR[role]}${B}${ROLE_CN[role]}${R}  已上線`);
  }
  await sleep(400);
  console.log(`\n  ${GR}${B}全部 ${sockets.length} 個角色已就位${R}`);

  // ③ Start game
  header('③ 開始兵推');
  const tsmc = accounts.find((a) => a.role === 'tsmc');
  let game = await apiPost('/games/start', {}, tsmc.accessToken);
  console.log(`  ${GR}✓${R}  ${B}${game.name}${R}`);
  console.log(`  ${D}ID: ${game.id}${R}`);

  // ④ Rounds
  header('④ 模擬開始');
  while (game.status === 'active') {
    const roundNum = game.currentRoundNumber;
    console.log(`\n  ${B}${YL}▶ 第 ${roundNum} 輪${R}`);
    divider();

    await Promise.all(
      accounts.map(async ({ role, accessToken }) => {
        const delay = randInt(0, 5000);
        await sleep(delay);
        const payload = randomPayload(role);
        const result = await apiPost(
          `/games/${game.id}/rounds/${roundNum}/submissions`,
          { gameRole: role, payload },
          accessToken,
        );
        const phaseTag = result.phase === 'resolved' ? `${GR}resolved${R}` : `${YL}${result.phase}${R}`;
        console.log(`  ${GR}✓${R}  ${ROLE_COLOR[role]}${B}${padEnd(ROLE_CN[role], 6)}${R}  ${formatPayload(role, payload)}  ${D}(${(delay/1000).toFixed(1)}s)${R}  → ${phaseTag}`);
      }),
    );

    // Poll for resolution
    let updated = game;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      updated = await apiGet(`/games/${game.id}`, tsmc.accessToken);
      const round = updated.rounds.find((r) => r.roundNumber === roundNum);
      if (round?.phase === 'resolved' || updated.status !== 'active') break;
    }
    game = updated;

    const round = game.rounds.find((r) => r.roundNumber === roundNum);
    if (round?.result) {
      const r = round.result;
      divider();
      console.log(
        `  ${B}結果${R}  ` +
        `民意 ${B}${YL}${r.finalOpinion}${R} ${bar(r.finalOpinion)}  ` +
        `攻台 ${B}${r.finalAttack <= 50 ? GR : RD}${r.finalAttack}${R} ${bar(r.finalAttack)}  ` +
        `${r.thinkTankEndorsed ? `${MG}智庫背書${R}` : `${D}未背書${R}`}  ` +
        badge(r.allOk),
      );
    }
  }

  // ── Summary ──
  const { opinion, attackProb, roundHistory } = game.aggregateState;
  const allPassed = roundHistory.every((r) => r.allOk);

  console.log('');
  console.log(`${B}${CY}╔══════════════════════════════════════════════════╗${R}`);
  console.log(`${B}${CY}║${R}${B}  兵推結束                                         ${CY}║${R}`);
  console.log(`${B}${CY}╚══════════════════════════════════════════════════╝${R}`);
  console.log('');
  console.log(`  ${B}最終民意    ${R}  ${B}${YL}${opinion}${R}  ${bar(opinion)}`);
  console.log(`  ${B}最終攻台機率${R}  ${B}${attackProb <= 50 ? GR : RD}${attackProb}${R}  ${bar(attackProb)}`);
  console.log('');
  console.log(`  ${D}${'回合'.padEnd(4)}  ${'民意'.padEnd(4)}  ${'攻台機率'.padEnd(6)}  結果${R}`);
  console.log(`  ${D}${'─'.repeat(32)}${R}`);
  for (const h of roundHistory) {
    console.log(`  第 ${h.roundNumber} 輪   ${B}${h.finalOpinion}${R}     ${B}${h.finalAttack}${R}        ${h.allOk ? `${GR}✓ PASS${R}` : `${RD}✗ FAIL${R}`}`);
  }
  console.log('');
  console.log(`  總評  ${badge(allPassed)}  ${allPassed ? `${GR}所有回合通過，台灣安全！${R}` : `${RD}部分回合未通過${R}`}`);
  console.log('');

  const again = await promptReplay();
  for (const s of sockets) s.disconnect();

  if (again) {
    process.stdout.write('\x1b[2J\x1b[H');
    await main();
  } else {
    process.exit(allPassed ? 0 : 1);
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
