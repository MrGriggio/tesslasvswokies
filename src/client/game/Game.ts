import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Socket } from 'socket.io-client';
import { PlayerType, GameState, PlayerState } from '../../shared/types';
import { World } from '../game/World';
import { Player } from './Player';
import { InputHandler, InputState } from './InputHandler';

export class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
    private world: World;
    private player: Player;
    private otherPlayers: Map<string, Player>;
    private input: InputHandler;
    private socket: Socket;
    private gameState: GameState;
    private lastTime: number;
    private isRunning: boolean;
    private initialized: boolean = false;
    private isHunter: boolean = false;
    private isLowPerformanceMode: boolean = false;
    private frameCount: number = 0;
    private playerName: string;
    private team: 'tesla' | 'wookie';

    constructor(socket: Socket, playerName: string, team: 'tesla' | 'wookie') {
        console.log("Game constructor called for", playerName, team);
        
        try {
            // Initialize Three.js scene
            this.scene = new THREE.Scene();
            console.log("Scene created");

            // Initialize camera with good default values for a car game
            this.camera = new THREE.PerspectiveCamera(
                75, // FOV
                window.innerWidth / window.innerHeight,
                0.1, // Near plane
                1000 // Far plane
            );
            console.log("Camera created");
            
            // Get the container element
            const container = document.getElementById('game-container');
            if (!container) {
                throw new Error("Game container element not found!");
            }
            
            // Create renderer with good default settings
            this.setupRenderer();
            
            // Initialize other properties
            this.socket = socket;
            this.otherPlayers = new Map();
            this.input = new InputHandler();
            this.lastTime = performance.now();
            this.isRunning = false;
            this.isHunter = team === 'wookie';
            this.playerName = playerName;
            this.team = team;
            
            // Show appropriate HUD
            document.getElementById('tesla-hud')!.style.display = this.isHunter ? 'none' : 'block';
            document.getElementById('hunter-hud')!.style.display = this.isHunter ? 'block' : 'none';

            // Initialize world and player
            this.world = new World(this.scene);
            // Create player with isLocalPlayer = true and use socket ID for player name
            this.player = new Player(
                this.team === 'tesla' ? PlayerType.TESLA : PlayerType.HUNTER, 
                this.scene, 
                this.camera, 
                true, // isLocalPlayer
                this.playerName
            );
            this.gameState = {
                players: new Map(),
                projectiles: []
            };

            // Set up event listeners
            window.addEventListener('resize', this.onWindowResize.bind(this));
            
            console.log("Game constructor completed successfully");
        } catch (error) {
            console.error("Error in Game constructor:", error);
            throw error;
        }
    }

    init(): void {
        if (this.initialized) {
            console.warn("Game already initialized");
            return;
        }
        
        try {
            console.log("Starting game initialization...");
            
            // Set up socket listeners first
            console.log("Setting up socket listeners");
            this.setupSocketListeners();
            
            console.log("Initializing world");
            this.world.init();
            
            console.log("Initializing player with safe spawn location");
            this.initPlayer(this.player.getType() === 'wookie' ? PlayerType.HUNTER : PlayerType.TESLA);
            
            // Set up scene lighting
            console.log("Setting up lighting");
            this.setupLighting();
            
            // Position camera for initial view
            console.log("Setting up camera");
            this.camera.position.set(0, 5, -10);
            this.camera.lookAt(0, 0, 0);
            
            // Emit initial player state
            console.log("Sending initial player state to server");
            const initialState = this.player.getState();
            this.socket.emit('playerJoined', initialState);
            
            console.log("Starting game loop");
            this.isRunning = true;
            this.initialized = true;
            
            // Start animation loop
            console.log("Starting animation loop");
            requestAnimationFrame(this.animate.bind(this));
            
            // Show controls to player
            this.showControlsMessage();
            
            console.log("Game initialized successfully");
        } catch (error) {
            console.error("Error in Game.init():", error);
            if (error instanceof Error) {
                console.error("Error details:", error.message);
                console.error("Stack trace:", error.stack);
            }
            throw new Error(`Failed to initialize game components: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private setupRenderer(): void {
        console.log("Setting up renderer");
        try {
            this.renderer = new THREE.WebGLRenderer({
                antialias: false, // Disable antialiasing completely
                powerPreference: 'high-performance',
                precision: 'lowp' // Use lowest precision for better performance
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(0.75); // Force lower resolution rendering
            this.renderer.shadowMap.enabled = false; // Disable shadows completely for better performance
            this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
            
            // Set renderer to clear automatically for performance
            this.renderer.autoClear = true;
            
            // Add renderer to DOM
            const container = document.getElementById('game-container');
            if (!container) {
                throw new Error("Could not find game container element");
            }
            container.appendChild(this.renderer.domElement);
            
            // Handle resize events
            window.addEventListener('resize', this.handleResize.bind(this));
            
            // Enable performance mode
            this.isLowPerformanceMode = true;
            this.frameCount = 0;
            
            console.log("Renderer setup complete with low performance settings");
        } catch (error) {
            console.error("Error setting up renderer:", error);
            throw error;
        }
    }

    private setupLighting(): void {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Add directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        
        // Improve shadow quality
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        
        this.scene.add(directionalLight);
    }

    private setupSocketListeners(): void {
        console.log("Setting up socket listeners");
        
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isRunning = false;
        });

        this.socket.on('error', (error: any) => {
            console.error('Socket error:', error);
        });

        this.socket.on('gameState', (state: GameState) => {
            console.log('Received game state update');
            this.gameState = state;
            this.updateOtherPlayers();
        });

        this.socket.on('playerJoined', (player: PlayerState) => {
            console.log('Player joined:', player);
            if (player.id !== this.socket.id) {
                this.addOtherPlayer(player);
            }
        });

        this.socket.on('playerLeft', (playerId: string) => {
            console.log('Player left:', playerId);
            this.removeOtherPlayer(playerId);
        });

        console.log("Socket listeners setup complete");
    }

    private updateOtherPlayers(): void {
        Object.entries(this.gameState.players).forEach(([id, state]) => {
            if (id !== this.socket.id) {
                if (!this.otherPlayers.has(id)) {
                    this.addOtherPlayer(state);
                } else {
                    this.otherPlayers.get(id)?.updateState(state);
                }
            }
        });
        
        // Update other players' name labels
        this.otherPlayers.forEach(player => {
            // Ensure name labels face the camera
            const nameLabel = player.getMesh().children.find((child: THREE.Object3D) => child instanceof THREE.Sprite);
            if (nameLabel) {
                nameLabel.lookAt(this.camera.position);
            }
        });
    }

    private addOtherPlayer(state: PlayerState): void {
        console.log("Adding other player", state);
        // Create player with isLocalPlayer = false
        const player = new Player(
            state.type, 
            this.scene, 
            null, // No camera for other players
            false, // Not local player
            state.type === PlayerType.TESLA ? `Tesla ${state.id.substr(0, 3)}` : `Hunter ${state.id.substr(0, 3)}`
        );
        player.init();
        player.updateState(state);
        this.otherPlayers.set(state.id, player);
        
        // Update the player count in HUD
        const playersElement = document.getElementById('players');
        if (playersElement) {
            playersElement.textContent = `Players: ${this.otherPlayers.size + 1}`;
        }
    }

    private removeOtherPlayer(id: string): void {
        const player = this.otherPlayers.get(id);
        if (player) {
            player.dispose();
            this.otherPlayers.delete(id);
            
            // Update the player count in HUD
            const playersElement = document.getElementById('players');
            if (playersElement) {
                playersElement.textContent = `Players: ${this.otherPlayers.size + 1}`;
            }
        }
    }

    private update(deltaTime: number): void {
        if (!this.isRunning) return;
        
        try {
            // Update player
            this.player.update(deltaTime, this.input.getState());
            
            // Update physics world
            this.world.update(deltaTime);

            // Send player state to server
            const playerState: PlayerState = this.player.getState();
            this.socket.emit('updatePlayer', playerState);
            
            // Update other players' name labels
            this.otherPlayers.forEach(player => {
                // Ensure name labels face the camera
                const nameLabel = player.getMesh().children.find((child: THREE.Object3D) => child instanceof THREE.Sprite);
                if (nameLabel) {
                    nameLabel.lookAt(this.camera.position);
                }
            });
        } catch (error) {
            console.error("Error in game update:", error);
            // Don't throw here to keep the game running
        }
    }

    private animate(): void {
        requestAnimationFrame(this.animate.bind(this));
        
        if (!this.initialized) return;
        
        // Calculate delta time
        const now = performance.now();
        const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1); // Cap at 100ms
        this.lastTime = now;
        
        // Skip rendering if tab is not visible
        if (document.hidden) return;
        
        // Update game state - always update physics and input
        if (this.player) {
            // Update player with current input
            this.player.update(deltaTime, this.input.getState());
        }
        
        // Update world physics and objects
        if (this.world) {
            this.world.update(deltaTime);
        }
        
        // Throttle rendering in low performance mode (render every 2nd frame)
        const frameSkip = this.isLowPerformanceMode ? 2 : 1;
        if (this.frameCount % frameSkip === 0) {
            // Render scene
            this.renderer.render(this.scene, this.camera);
        }
        this.frameCount++;
    }

    onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    pause(): void {
        this.isRunning = false;
    }

    resume(): void {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTime = performance.now();
            this.animate();
        }
    }

    dispose(): void {
        this.isRunning = false;
        this.input.dispose();
        this.player.dispose();
        this.otherPlayers.forEach(player => player.dispose());
        this.otherPlayers.clear();
        this.renderer.dispose();
    }

    private showControlsMessage(): void {
        const message = document.createElement('div');
        message.innerHTML = `
            <div style="position: fixed; bottom: 20px; left: 20px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; z-index: 1000;">
                <h3>Controls:</h3>
                <p>W/S - Accelerate/Brake</p>
                <p>A/D - Turn Left/Right</p>
                <p>Shift - Boost</p>
                <p>I - Shoot (as Hunter)</p>
                <p>(Click to hide this message)</p>
            </div>
        `;
        const controlsElement = message.firstElementChild as HTMLElement;
        document.body.appendChild(controlsElement);
        
        // Remove on click
        controlsElement.addEventListener('click', () => {
            controlsElement.remove();
        });
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (controlsElement.parentNode) {
                controlsElement.remove();
            }
        }, 10000);
    }

    private handleResize(): void {
        this.onWindowResize();
    }

    private initPlayer(type: PlayerType): void {
        try {
            // Find a safe spawn location away from buildings
            const safeSpawnPosition = this.findSafeSpawnLocation();
            
            console.log("Creating player with type:", type);
            this.player = new Player(type, this.scene, this.camera);
            console.log("Player created successfully");
            
            this.player.init();
            console.log("Player initialized successfully");
            
            // Position the player at the safe spawn location
            this.player.getBody().position.set(safeSpawnPosition.x, 0.6, safeSpawnPosition.z);
            
            // Create a valid InputState object with all required properties
            const emptyInputState: InputState = { 
                forward: false, 
                backward: false, 
                left: false, 
                right: false, 
                boost: false, 
                shoot: false, 
                shield: false,
                mouseX: 0,
                mouseY: 0
            };
            
            this.player.update(0, emptyInputState);
            
            // Add player's physics body to world
            this.world.addBody(this.player.getBody());
            this.player.setPhysicsWorldAdded(true);
            console.log("Player physics body added to world");
        } catch (error) {
            console.error("Error in initPlayer:", error);
        }
    }

    // Find a safe location to spawn the player away from buildings
    private findSafeSpawnLocation(): THREE.Vector3 {
        const physicsWorld = this.world.getPhysicsWorld();
        const safetyRadius = 5; // Minimum distance from any building
        const maxAttempts = 20; // Maximum number of attempts to find a safe spot
        
        // Start with potential spawn locations in different areas
        const potentialSpawns = [
            new THREE.Vector3(0, 0.6, 0),         // Center
            new THREE.Vector3(30, 0.6, 30),       // Northeast
            new THREE.Vector3(-30, 0.6, 30),      // Northwest
            new THREE.Vector3(30, 0.6, -30),      // Southeast
            new THREE.Vector3(-30, 0.6, -30),     // Southwest
            new THREE.Vector3(60, 0.6, 0),        // East
            new THREE.Vector3(-60, 0.6, 0),       // West
            new THREE.Vector3(0, 0.6, 60),        // North
            new THREE.Vector3(0, 0.6, -60)        // South
        ];
        
        // First, try the predefined locations
        for (const spawnPos of potentialSpawns) {
            if (this.isLocationSafe(spawnPos, physicsWorld, safetyRadius)) {
                console.log("Found safe spawn location at predefined position:", spawnPos);
                return spawnPos;
            }
        }
        
        // If no predefined locations are safe, try random locations
        for (let i = 0; i < maxAttempts; i++) {
            const randomAngle = Math.random() * Math.PI * 2;
            const randomDistance = 30 + Math.random() * 100; // Between 30 and 130 units from center
            
            const randomSpawn = new THREE.Vector3(
                Math.cos(randomAngle) * randomDistance,
                0.6,
                Math.sin(randomAngle) * randomDistance
            );
            
            if (this.isLocationSafe(randomSpawn, physicsWorld, safetyRadius)) {
                console.log("Found safe spawn location at random position:", randomSpawn);
                return randomSpawn;
            }
        }
        
        // If all attempts fail, try to find the safest location among predefined spots
        let bestLocation = potentialSpawns[0];
        let maxDistance = 0;
        
        for (const spawnPos of potentialSpawns) {
            const closestDistance = this.getClosestObstacleDistance(spawnPos, physicsWorld);
            if (closestDistance > maxDistance) {
                maxDistance = closestDistance;
                bestLocation = spawnPos;
            }
        }
        
        console.log("No perfectly safe location found. Using best available location:", bestLocation);
        return bestLocation;
    }

    // Check if a location is safe (no buildings within safety radius)
    private isLocationSafe(position: THREE.Vector3, physicsWorld: CANNON.World, safetyRadius: number): boolean {
        // Create a physics sphere at the position to detect overlaps
        const testBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Sphere(safetyRadius),
            position: new CANNON.Vec3(position.x, position.y, position.z),
            collisionResponse: false // We just want to detect overlaps, not respond to them
        });
        
        // Temporarily add the body to the physics world
        physicsWorld.addBody(testBody);
        
        // Check for overlaps with other bodies (buildings)
        let isColliding = false;
        for (let i = 0; i < physicsWorld.bodies.length - 1; i++) {
            const body = physicsWorld.bodies[i];
            // Skip ground or other non-building bodies (mass > 0 bodies are usually not buildings)
            if (body.mass > 0 || body === testBody) continue;
            
            const result = this.checkBodyOverlap(testBody, body);
            if (result) {
                isColliding = true;
                break;
            }
        }
        
        // Remove the test body
        physicsWorld.removeBody(testBody);
        
        return !isColliding;
    }

    // Get the distance to the closest obstacle
    private getClosestObstacleDistance(position: THREE.Vector3, physicsWorld: CANNON.World): number {
        let minDistance = Number.MAX_VALUE;
        
        for (let i = 0; i < physicsWorld.bodies.length; i++) {
            const body = physicsWorld.bodies[i];
            // Skip non-building bodies
            if (body.mass > 0) continue;
            
            // Get the distance from position to this body
            const bodyPos = body.position;
            const distance = Math.sqrt(
                Math.pow(position.x - bodyPos.x, 2) +
                Math.pow(position.z - bodyPos.z, 2)
            );
            
            // Adjust for the body's size (approximate)
            // This is very approximate since buildings can have different shapes
            const bodySize = 2; // Approximate size of buildings
            const adjustedDistance = distance - bodySize;
            
            if (adjustedDistance < minDistance) {
                minDistance = adjustedDistance;
            }
        }
        
        return minDistance;
    }

    // Check if two physics bodies overlap
    private checkBodyOverlap(bodyA: CANNON.Body, bodyB: CANNON.Body): boolean {
        // We're just doing a simple distance check here
        // A more accurate check would use the actual collision shapes
        const distance = Math.sqrt(
            Math.pow(bodyA.position.x - bodyB.position.x, 2) +
            Math.pow(bodyA.position.y - bodyB.position.y, 2) +
            Math.pow(bodyA.position.z - bodyB.position.z, 2)
        );
        
        // Very rough approximation - assuming both bodies have some radius
        const sumRadii = 5; // Approximating the sum of radiuses of both bodies
        
        return distance < sumRadii;
    }
} 