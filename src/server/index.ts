import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { GameServer } from './GameServer';

const app = express();
const httpServer = createServer(app);

// Set up Socket.IO with CORS enabled for development
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins in development
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../../dist/client')));

// Basic route for testing server health
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Create game server instance
console.log('Creating game server instance...');
const gameServer = new GameServer(io);

// Start the server to allow external connections
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`For local access: http://localhost:${PORT}`);
    console.log(`For LAN/external access, use your machine's IP address:${PORT}`);
    console.log(`For online play, enable port forwarding on port ${PORT} in your router`);
}); 