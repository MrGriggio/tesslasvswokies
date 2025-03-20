import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

const app = express();
const httpServer = createServer(app);

// Configure Socket.IO with CORS
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins in development
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000, // Increase ping timeout for better connection stability
});

// Serve static files from the dist/client directory
app.use(express.static(path.join(__dirname, '../../dist/client')));

// Add a health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/client/index.html'));
});

// Store connected players
interface Player {
    name: string;
    team: 'tesla' | 'wookie';
    socket: any;
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
}

const players = new Map<string, Player>();

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Send initial connection acknowledgment
    socket.emit('connected', { id: socket.id });

    socket.on('join', (data: { name: string, team: 'tesla' | 'wookie' }) => {
        try {
            console.log(`${data.name} joined as ${data.team}`);
            
            // Store player info
            players.set(socket.id, {
                name: data.name,
                team: data.team,
                socket: socket,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 }
            });

            // Notify other players
            socket.broadcast.emit('playerJoined', {
                id: socket.id,
                name: data.name,
                team: data.team,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 }
            });

            // Send current players list to the new player
            const playersList = Array.from(players.entries()).map(([id, player]) => ({
                id,
                name: player.name,
                team: player.team,
                position: player.position,
                rotation: player.rotation
            }));
            socket.emit('currentPlayers', playersList);
        } catch (error) {
            console.error('Error in join handler:', error);
            socket.emit('error', { message: 'Failed to join game' });
        }
    });

    // Handle player movement
    socket.on('playerMove', (data: { position: any, rotation: any }) => {
        try {
            const player = players.get(socket.id);
            if (player) {
                player.position = data.position;
                player.rotation = data.rotation;
                
                // Broadcast movement to other players
                socket.broadcast.emit('playerMoved', {
                    id: socket.id,
                    position: data.position,
                    rotation: data.rotation
                });
            }
        } catch (error) {
            console.error('Error in movement handler:', error);
        }
    });

    // Handle player actions (boost, shield, etc.)
    socket.on('playerAction', (data: { action: string, target?: string }) => {
        try {
            const player = players.get(socket.id);
            if (player) {
                socket.broadcast.emit('playerAction', {
                    id: socket.id,
                    action: data.action,
                    target: data.target
                });
            }
        } catch (error) {
            console.error('Error in action handler:', error);
        }
    });

    socket.on('disconnect', () => {
        try {
            const player = players.get(socket.id);
            if (player) {
                console.log(`${player.name} left the game`);
                io.emit('playerLeft', {
                    id: socket.id,
                    name: player.name
                });
                players.delete(socket.id);
            }
        } catch (error) {
            console.error('Error in disconnect handler:', error);
        }
    });

    // Handle errors
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Performing graceful shutdown...');
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server time: ${new Date().toISOString()}`);
});