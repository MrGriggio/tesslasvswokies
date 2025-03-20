import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Serve static files from the dist/client directory
app.use(express.static(path.join(__dirname, '../../dist/client')));

// Store connected players
interface Player {
    name: string;
    team: 'tesla' | 'wookie';
    socket: any;
}

const players = new Map<string, Player>();

io.on('connection', (socket) => {
    console.log('Player connected');

    socket.on('join', (data: { name: string, team: 'tesla' | 'wookie' }) => {
        console.log(`${data.name} joined as ${data.team}`);
        
        // Store player info
        players.set(socket.id, {
            name: data.name,
            team: data.team,
            socket: socket
        });

        // Notify other players
        socket.broadcast.emit('playerJoined', {
            name: data.name,
            team: data.team
        });

        // Send current players list to the new player
        const playersList = Array.from(players.entries()).map(([id, player]) => ({
            name: player.name,
            team: player.team
        }));
        socket.emit('currentPlayers', playersList);
    });

    socket.on('disconnect', () => {
        const player = players.get(socket.id);
        if (player) {
            console.log(`${player.name} left the game`);
            io.emit('playerLeft', {
                name: player.name
            });
            players.delete(socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 