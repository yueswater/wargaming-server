#!/usr/bin/env bash
# Login gov, us, thinktank and hold their socket connections open.
# Periodically prints presence status via /api/users/role-presence.

SERVER="http://localhost:3001"
CHECK_INTERVAL=15
SERVER_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[keep-online] Reading credentials from .env..."

# Read credentials via node (safe — avoids bash special-char expansion)
read_env() {
  node -e "
    require('dotenv').config({ path: '$SERVER_DIR/.env', quiet: true });
    process.stdout.write(process.env['$1'] || '');
  "
}

ROLE_GOV_USER=$(read_env ROLE_GOV_USERNAME)
ROLE_GOV_PASS=$(read_env ROLE_GOV_PASSWORD)
ROLE_US_USER=$(read_env ROLE_US_USERNAME)
ROLE_US_PASS=$(read_env ROLE_US_PASSWORD)
ROLE_TT_USER=$(read_env ROLE_THINKTANK_USERNAME)
ROLE_TT_PASS=$(read_env ROLE_THINKTANK_PASSWORD)
ROLE_TSMC_USER=$(read_env ROLE_TSMC_USERNAME)
ROLE_TSMC_PASS=$(read_env ROLE_TSMC_PASSWORD)

# ── Login ──────────────────────────────────────────────────────────────────

login() {
  local username="$1" password="$2"
  local resp
  resp=$(curl -s -X POST "$SERVER/api/auth/login" \
    -H "Content-Type: application/json" \
    --data-raw "{\"username\":\"$username\",\"password\":\"$password\"}")
  echo "$resp" | node -e "
    const d = require('fs').readFileSync('/dev/stdin','utf8');
    try {
      const j = JSON.parse(d);
      if (!j.accessToken) { process.stderr.write('Login failed for $username: ' + d + '\n'); process.exit(1); }
      process.stdout.write(j.accessToken);
    } catch(e) { process.stderr.write('Parse error: ' + d + '\n'); process.exit(1); }
  "
}

echo "[keep-online] Logging in..."
TOKEN_GOV=$(login "$ROLE_GOV_USER" "$ROLE_GOV_PASS")   && echo "[keep-online]  gov       OK"
TOKEN_US=$(login "$ROLE_US_USER" "$ROLE_US_PASS")       && echo "[keep-online]  us        OK"
TOKEN_TT=$(login "$ROLE_TT_USER" "$ROLE_TT_PASS")       && echo "[keep-online]  thinktank OK"
TOKEN_TSMC=$(login "$ROLE_TSMC_USER" "$ROLE_TSMC_PASS") && echo "[keep-online]  tsmc      OK (for presence check)"

# ── Hold socket connections ────────────────────────────────────────────────

node -e "
const { io } = require('/home/anthony/wargaming/client/node_modules/socket.io-client');
const accounts = [
  { name: 'gov',       token: process.argv[1] },
  { name: 'us',        token: process.argv[2] },
  { name: 'thinktank', token: process.argv[3] },
];
accounts.forEach(({ name, token }) => {
  const sock = io('$SERVER', { auth: { token }, transports: ['websocket'] });
  sock.on('connect',       () => process.stdout.write('[socket] connected: ' + name + '\n'));
  sock.on('connect_error', (e) => process.stderr.write('[socket] error: ' + name + ' — ' + e.message + '\n'));
  sock.on('disconnect',    () => process.stdout.write('[socket] disconnected: ' + name + '\n'));
});
// Keep alive
" "$TOKEN_GOV" "$TOKEN_US" "$TOKEN_TT" &

SOCKET_PID=$!
echo "[keep-online] Socket PID: $SOCKET_PID"
echo "[keep-online] Press Ctrl+C to stop."
echo ""

# ── Periodic presence check ────────────────────────────────────────────────

cleanup() {
  echo ""
  echo "[keep-online] Stopping (PID $SOCKET_PID)..."
  kill "$SOCKET_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

while true; do
  sleep "$CHECK_INTERVAL"
  printf "── %s presence check ──────────────\n" "$(date '+%H:%M:%S')"
  curl -s "$SERVER/api/users/role-presence" \
    -H "Authorization: Bearer $TOKEN_TSMC" \
  | node -e "
      const d = require('fs').readFileSync('/dev/stdin','utf8');
      try {
        const j = JSON.parse(d);
        j.roleUsers.forEach(u => {
          const col = u.online ? '\x1b[32m ONLINE \x1b[0m' : '\x1b[90moffline\x1b[0m';
          console.log(' ', col, u.gameRole.padEnd(12), u.username);
        });
        console.log('  allOnline:', j.allOnline ? '\x1b[32mtrue\x1b[0m' : 'false');
      } catch(e) { console.log('  (parse error)', d.slice(0,120)); }
    "
done
