import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { RoomManager } from './rooms/RoomManager.js';
import { setupSocketHandlers } from './networking/socketHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    service: 'jetpack-arena-server',
  });
});

// Serve client production build if available
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Fallback for SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/socket.io') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      // If client not built yet in dev mode
      res.status(200).send('Jetpack Arena API Server Running. (Client running on dev port or unbuilt)');
    }
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const roomManager = new RoomManager(io);
setupSocketHandlers(io, roomManager);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Jetpack Arena] Server listening on http://0.0.0.0:${PORT}`);
  console.log(`[Jetpack Arena] Health check available at http://0.0.0.0:${PORT}/health`);
});
