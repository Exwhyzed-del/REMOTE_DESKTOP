import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'dist')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store active peers
const peers = new Map();

io.on('connection', (socket) => {
  console.log('Peer connected:', socket.id);

  // Register peer with device ID
  socket.on('register', (deviceId) => {
    peers.set(deviceId, socket.id);
    console.log('Registered device:', deviceId, '->', socket.id);
    io.emit('peer-list', Array.from(peers.keys()));
  });

  // Handle signaling messages
  socket.on('signal', ({ to, from, signal }) => {
    const targetSocketId = peers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('signal', { from, signal });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Peer disconnected:', socket.id);
    // Remove from peers map
    for (const [deviceId, socketId] of peers.entries()) {
      if (socketId === socket.id) {
        peers.delete(deviceId);
        console.log('Unregistered device:', deviceId);
        break;
      }
    }
    io.emit('peer-list', Array.from(peers.keys()));
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
