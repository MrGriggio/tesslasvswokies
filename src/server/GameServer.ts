import { Server, Socket } from 'socket.io';
import { PlayerType, GameState, PlayerState } from '../shared/types';

interface GameConfig {
    maxPlayers: number;
    updateInterval: number;
}

export class GameServer {
    private io: Server;
    private gameState: GameState = {
        players: new Map<string, PlayerState>(),
        projectiles: []
    };
    private config: GameConfig = {
        maxPlayers: 20,
        updateInterval: 1000 / 60 // 60 times per second
    };
    private updateInterval: NodeJS.Timeout | null = null;
    private playerSockets: Map<string, Socket> = new Map();

    constructor(io: Server) {
        this.io = io;
        this.setupSocketHandlers();
        this.startGameLoop();
    }

    private setupSocketHandlers(): void {
        this.io.on('connection', (socket: Socket) => {
            console.log('Player connected:', socket.id);

            socket.on('join', (playerType: PlayerType, callback: (response: { success: boolean, error?: string }) => void) => {
                console.log(`Player ${socket.id} joining as ${playerType}`);
                
                try {
                    // Validate player type
                    if (playerType !== PlayerType.HUNTER && playerType !== PlayerType.TESLA) {
                        callback({ success: false, error: 'Invalid player type' });
                        return;
                    }

                    // Check if max players reached
                    if (this.gameState.players.size >= this.config.maxPlayers) {
                        callback({ success: false, error: 'Game is full' });
                        return;
                    }

                    // Check if player is already in game
                    if (this.gameState.players.has(socket.id)) {
                        callback({ success: false, error: 'Already in game' });
                        return;
                    }

                    // Allow multiple players of each role (both Tesla and Hunter)
                    // Initialize player state
                    const playerState: PlayerState = {
                        id: socket.id,
                        type: playerType,
                        position: this.getRandomSpawnPosition(playerType),
                        rotation: { x: 0, y: 0, z: 0 },
                        health: playerType === PlayerType.HUNTER ? 80 : 100,
                        isAlive: true,
                        boostCharges: 3
                    };

                    // Add player to game state
                    this.gameState.players.set(socket.id, playerState);
                    this.playerSockets.set(socket.id, socket);

                    // Send current game state to the new player
                    socket.emit('gameState', {
                        players: Object.fromEntries(this.gameState.players),
                        projectiles: this.gameState.projectiles
                    });

                    // Notify other players
                    socket.broadcast.emit('playerJoined', playerState);
                    
                    console.log(`Player ${socket.id} joined successfully as ${playerType}`);
                    callback({ success: true });
                } catch (error) {
                    console.error('Error in join handler:', error);
                    callback({ success: false, error: 'Internal server error' });
                }
            });

            socket.on('disconnect', (reason) => {
                console.log('Player disconnected:', socket.id, 'Reason:', reason);
                
                try {
                    // Remove player from game state
                    this.gameState.players.delete(socket.id);
                    this.playerSockets.delete(socket.id);

                    // Notify other players
                    this.io.emit('playerLeft', socket.id);
                } catch (error) {
                    console.error('Error in disconnect handler:', error);
                }
            });

            socket.on('updatePlayer', (update: Partial<PlayerState>) => {
                try {
                    const player = this.gameState.players.get(socket.id);
                    if (player) {
                        // Validate update data
                        if (update.position) {
                            player.position = update.position;
                        }
                        if (update.rotation) {
                            player.rotation = update.rotation;
                        }
                        if (typeof update.health === 'number') {
                            player.health = Math.max(0, Math.min(100, update.health));
                        }
                        if (typeof update.isAlive === 'boolean') {
                            player.isAlive = update.isAlive;
                        }
                        if (typeof update.boostCharges === 'number') {
                            player.boostCharges = Math.max(0, Math.min(3, update.boostCharges));
                        }

                        // Broadcast update to other players
                        socket.broadcast.emit('playerUpdated', player);
                    }
                } catch (error) {
                    console.error('Error in updatePlayer handler:', error);
                }
            });

            socket.on('shoot', (projectileData: any) => {
                try {
                    const player = this.gameState.players.get(socket.id);
                    if (!player || player.type !== PlayerType.HUNTER) {
                        return;
                    }

                    // Add projectile to game state
                    const projectile = {
                        ...projectileData,
                        playerId: socket.id,
                        createdAt: Date.now()
                    };
                    this.gameState.projectiles.push(projectile);

                    // Broadcast projectile to all players
                    this.io.emit('projectileCreated', projectile);
                } catch (error) {
                    console.error('Error in shoot handler:', error);
                }
            });

            socket.on('hit', (data: { targetId: string, damage: number }) => {
                try {
                    const target = this.gameState.players.get(data.targetId);
                    const attacker = this.gameState.players.get(socket.id);

                    if (target && attacker && attacker.type === PlayerType.HUNTER) {
                        // Apply damage
                        target.health = Math.max(0, target.health - data.damage);
                        
                        if (target.health <= 0) {
                            target.isAlive = false;
                            this.io.emit('playerDied', {
                                targetId: data.targetId,
                                killerId: socket.id
                            });
                        }
                        
                        // Update target's state for all players
                        this.io.emit('playerUpdated', target);
                    }
                } catch (error) {
                    console.error('Error in hit handler:', error);
                }
            });

            // Handle errors
            socket.on('error', (error) => {
                console.error('Socket error for player', socket.id, ':', error);
            });
        });
    }

    private startGameLoop(): void {
        let lastTime = Date.now();
        this.updateInterval = setInterval(() => {
            const currentTime = Date.now();
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            // Update game state
            this.updateProjectiles(deltaTime);

            // Send game state to all clients
            this.io.emit('gameState', {
                players: Object.fromEntries(this.gameState.players),
                projectiles: this.gameState.projectiles
            });
        }, this.config.updateInterval);
    }

    private updateProjectiles(deltaTime: number): void {
        // Update projectile positions
        this.gameState.projectiles = this.gameState.projectiles.filter(projectile => {
            // Move projectile
            projectile.position.x += projectile.velocity.x * deltaTime;
            projectile.position.y += projectile.velocity.y * deltaTime;
            projectile.position.z += projectile.velocity.z * deltaTime;

            // Check for collisions with players
            for (const [id, player] of this.gameState.players.entries()) {
                if (player.type === PlayerType.TESLA && player.isAlive && id !== projectile.playerId) {
                    const distance = Math.sqrt(
                        Math.pow(projectile.position.x - player.position.x, 2) +
                        Math.pow(projectile.position.y - player.position.y, 2) +
                        Math.pow(projectile.position.z - player.position.z, 2)
                    );

                    if (distance < 1) { // Hit detection radius
                        player.health -= 10; // Damage amount
                        if (player.health <= 0) {
                            player.isAlive = false;
                            this.io.emit('playerDied', id);
                        }
                        this.io.emit('playerUpdated', player);
                        return false; // Remove projectile
                    }
                }
            }

            // Remove projectiles that have traveled too far
            const maxDistance = 50;
            const distanceFromStart = Math.sqrt(
                Math.pow(projectile.position.x, 2) +
                Math.pow(projectile.position.y, 2) +
                Math.pow(projectile.position.z, 2)
            );
            return distanceFromStart <= maxDistance;
        });
    }

    private getRandomSpawnPosition(playerType: PlayerType): { x: number, y: number, z: number } {
        // Different spawn areas for different player types
        const spawnRadius = 100; // Adjust based on your map size
        
        let x, z;
        if (playerType === PlayerType.TESLA) {
            // Spawn Tesla cars near the center
            x = (Math.random() - 0.5) * spawnRadius * 0.5;
            z = (Math.random() - 0.5) * spawnRadius * 0.5;
        } else {
            // Spawn Hunters around the perimeter
            const angle = Math.random() * Math.PI * 2;
            const distance = spawnRadius * 0.7 + Math.random() * spawnRadius * 0.3;
            x = Math.cos(angle) * distance;
            z = Math.sin(angle) * distance;
        }
        
        return { 
            x, 
            y: 1, // Fixed height above ground
            z
        };
    }

    dispose(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.io.close();
    }
} 