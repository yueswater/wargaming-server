const express = require('express');
const cors = require('cors');
const http = require('http');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const gameRoutes = require('./routes/game.routes');
const simulationRoutes = require('./routes/simulation.routes');
const scenarioRoutes = require('./routes/scenario.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const { clientOrigin } = require('./config/auth.config');
const { initDatabase } = require('./db');
const { seedRoleUsers } = require('./services/seed.service');
const { socketAuth } = require('./socket/socketAuth');
const { registerSocketHandlers } = require('./socket/registerSocketHandlers');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: clientOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/scenarios', scenarioRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    credentials: true,
  },
});

async function bootstrap() {
  await initDatabase();
  await seedRoleUsers();
  app.set('io', io);
  io.use(socketAuth);
  registerSocketHandlers(io);

  server.listen(PORT, () => {
    console.log(`🎖️  兵推後端伺服器已啟動: http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('伺服器啟動失敗', error);
  process.exit(1);
});

module.exports = { app, server, io, bootstrap };
