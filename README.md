# wargaming-server

[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io&logoColor=white)](https://socket.io)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Backend API and WebSocket server for the TSMC Crisis Wargame — a multi-player, turn-based negotiation simulation.

## Overview

This server manages authentication, real-time presence, game room lifecycle, per-role decision submission, and round resolution. Four fixed role accounts (TSMC, Executive Yuan, US Government, Think Tank) connect simultaneously and submit decisions each round. The engine merges all four submissions and resolves the outcome after every round.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24 |
| HTTP framework | Express 4 |
| Real-time | Socket.io 4 |
| Database | SQLite (via `sqlite` + `sqlite3`) |
| Auth | JWT (access + refresh token rotation) |
| Password hashing | bcrypt |

## Project Structure

```
server/
  src/
    config/          - Auth and app config
    controllers/     - Route handlers
    db/              - SQLite initialisation and migrations
    middleware/       - Auth and error middleware
    models/          - User, refresh token, game models
    routes/          - Express routers
    services/        - Business logic (auth, game engine, round resolver)
    socket/          - Socket.io auth middleware and event handlers
  .env.example
  package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default: `3001`) |
| `CLIENT_ORIGIN` | Allowed CORS origin (e.g. `http://localhost:5173`) |
| `DATABASE_PATH` | SQLite file path (e.g. `./data/wargaming.sqlite`) |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (e.g. `7d`) |
| `BCRYPT_ROUNDS` | bcrypt cost factor (e.g. `12`) |
| `COOKIE_SECURE` | Set `true` in production (HTTPS only) |
| `ALLOW_SELF_REGISTRATION` | Set `false` to disable public registration |
| `ROLE_TSMC_USERNAME` | Login username for the TSMC role account |
| `ROLE_TSMC_PASSWORD` | Password for the TSMC role account |
| `ROLE_TSMC_DISPLAY_NAME` | Display name for the TSMC role |
| `ROLE_GOV_USERNAME` | Login username for the Executive Yuan role |
| `ROLE_GOV_PASSWORD` | Password for the Executive Yuan role |
| `ROLE_GOV_DISPLAY_NAME` | Display name for the Executive Yuan role |
| `ROLE_US_USERNAME` | Login username for the US Government role |
| `ROLE_US_PASSWORD` | Password for the US Government role |
| `ROLE_US_DISPLAY_NAME` | Display name for the US Government role |
| `ROLE_THINKTANK_USERNAME` | Login username for the Think Tank role |
| `ROLE_THINKTANK_PASSWORD` | Password for the Think Tank role |
| `ROLE_THINKTANK_DISPLAY_NAME` | Display name for the Think Tank role |

### Running

```bash
# Development
node src/index.js

# Production
NODE_ENV=production node src/index.js
```

On first start the server automatically creates the SQLite schema and seeds all four role accounts from environment variables.

## API Reference

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login with username and password |
| `POST` | `/api/auth/logout` | Revoke current refresh token |
| `POST` | `/api/auth/refresh` | Rotate refresh token and issue new access token |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/users/me` | Required | Get current user profile |
| `GET` | `/api/users/role-presence` | Required | Get online status for all four role accounts |
| `POST` | `/api/users/change-password` | Required | Change password |

### Games

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/games/start` | Required | Create and start a new game (seats all online role accounts) |
| `GET` | `/api/games/active` | Required | Get the current active or lobby game |
| `GET` | `/api/games/:id` | Required | Get a specific game by ID |
| `POST` | `/api/games/:id/rounds/:roundNumber/submissions` | Required | Submit a role decision for the current round |

## Socket.io Events

### Server to Client

| Event | Payload | Description |
|-------|---------|-------------|
| `presence:update` | `{ connectedUserIds }` | Broadcast when any user connects or disconnects |
| `round:submission-status` | `{ gameId, roundNumber, submittedRoles }` | Broadcast after each role submits (no payload content revealed) |
| `round:submission-detail` | `{ gameId, roundNumber, role, payload, submittedAt }` | Broadcast to admin/godview immediately after each role submits |
| `round:resolved` | `{ gameId, roundNumber, result, mergedDecision, gameStatus, nextRoundNumber, aggregateState }` | Broadcast when all four roles have submitted and the round is resolved |

### Client to Server

Authentication is performed at connection time via `socket.handshake.auth.token` (access JWT).

## Game Engine

The engine (`src/services/gameEngine.js`) calculates negotiation outcomes based on merged decisions from all four roles. Key outputs per round:

- `finalOpinion` — public opinion score (target: >= 60)
- `finalAttack` — probability of military action (target: <= 30%)
- `thinkTankEndorsed` — whether the think tank endorsement conditions were met
- `specialClauses` — triggered penalty clauses (emergency order, forced defense, etc.)

Each round's four role submissions are merged by `submissionMerger.service.js` into a single set of negotiation parameters before being passed to the engine.
