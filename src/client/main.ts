// Import crypto polyfill first, before any other imports
import '../polyfills/crypto.js';

import { io, Socket } from 'socket.io-client';
import { Game } from './game/Game';
import { PlayerType } from '../shared/types';

let game: Game | null = null;
let socket: Socket;
let serverAddress = `http://${window.location.hostname}:3000`; // Default server address

function updateConnectionStatus(status: string, isConnected: boolean = false) {
    const statusElement = document.getElementById('connection-status');
    const teslaBtn = document.getElementById('tesla-btn') as HTMLButtonElement;
    const hunterBtn = document.getElementById('hunter-btn') as HTMLButtonElement;
    const menuMessage = document.getElementById('menu-message');

    if (statusElement) {
        statusElement.textContent = status;
        statusElement.classList.remove('connected', 'connecting');
        if (isConnected) {
            statusElement.classList.add('connected');
        } else if (status.includes('Connecting')) {
            statusElement.classList.add('connecting');
        }
    }

    // Enable/disable buttons based on connection status
    if (teslaBtn) teslaBtn.disabled = !isConnected;
    if (hunterBtn) hunterBtn.disabled = !isConnected;
    if (menuMessage) menuMessage.textContent = isConnected ? 'Choose your role to begin!' : 'Connecting to server...';
}

function connectToServer(address: string) {
    updateConnectionStatus(`Connecting to ${address}...`);
    
    // Disconnect from existing socket if any
    if (socket) {
        socket.disconnect();
    }
    
    // Add http:// prefix if not present
    if (!address.startsWith('http://') && !address.startsWith('https://')) {
        address = `http://${address}`;
    }
    
    try {
        // Connect to the WebSocket server
        socket = io(address, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000,
            transports: ['websocket', 'polling'] // Try WebSocket first, fallback to polling
        });
        
        setupSocketEvents();
    } catch (error) {
        console.error('Error connecting to server:', error);
        updateConnectionStatus(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function setupSocketEvents() {
    socket.on('connect', () => {
        console.log('Connected to server!', socket.id);
        updateConnectionStatus('Connected to server', true);
        
        // Re-enable buttons
        const teslaBtn = document.getElementById('tesla-btn') as HTMLButtonElement;
        const hunterBtn = document.getElementById('hunter-btn') as HTMLButtonElement;
        if (teslaBtn) teslaBtn.disabled = false;
        if (hunterBtn) hunterBtn.disabled = false;
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        updateConnectionStatus(`Connection error: ${error.message}`);
        
        // Disable buttons
        const teslaBtn = document.getElementById('tesla-btn') as HTMLButtonElement;
        const hunterBtn = document.getElementById('hunter-btn') as HTMLButtonElement;
        if (teslaBtn) teslaBtn.disabled = true;
        if (hunterBtn) hunterBtn.disabled = true;
    });

    socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        updateConnectionStatus(`Disconnected from server: ${reason}. Attempting to reconnect...`);
        
        // Clean up game if it exists
        if (game) {
            game.dispose();
            game = null;
        }
        
        // Disable buttons
        const teslaBtn = document.getElementById('tesla-btn') as HTMLButtonElement;
        const hunterBtn = document.getElementById('hunter-btn') as HTMLButtonElement;
        if (teslaBtn) teslaBtn.disabled = true;
        if (hunterBtn) hunterBtn.disabled = true;
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected to server after', attemptNumber, 'attempts');
        updateConnectionStatus('Reconnected to server', true);
    });

    socket.on('reconnect_error', (error) => {
        console.error('Reconnection error:', error);
        updateConnectionStatus('Failed to reconnect. Please refresh the page.');
    });

    socket.on('reconnect_failed', () => {
        console.error('Failed to reconnect after all attempts');
        updateConnectionStatus('Failed to reconnect after multiple attempts. Please refresh the page.');
    });
}

try {
    // Set up button click handlers
    document.getElementById('tesla-btn')?.addEventListener('click', () => {
        if (!socket || !socket.connected) {
            updateConnectionStatus('Not connected to server. Please wait for connection...');
            return;
        }
        startGame(PlayerType.TESLA);
    });

    document.getElementById('hunter-btn')?.addEventListener('click', () => {
        if (!socket || !socket.connected) {
            updateConnectionStatus('Not connected to server. Please wait for connection...');
            return;
        }
        startGame(PlayerType.HUNTER);
    });
    
    // Set up the server connection form
    document.getElementById('connect-btn')?.addEventListener('click', () => {
        const serverInput = document.getElementById('server-address') as HTMLInputElement;
        const serverAddr = serverInput.value.trim();
        
        if (serverAddr) {
            serverAddress = serverAddr;
            connectToServer(serverAddress);
        } else {
            // Default to local server if no address is provided
            connectToServer(`http://${window.location.hostname}:3000`);
        }
    });
    
    // Initial connection to local server
    connectToServer(serverAddress);

} catch (error) {
    console.error('Error initializing game:', error);
    updateConnectionStatus('Failed to initialize game. Please refresh the page.');
}

function startGame(playerType: PlayerType) {
    try {
        console.log('Starting game as', playerType);
        
        // Hide menu
        const menu = document.getElementById('menu');
        if (menu) menu.classList.remove('active');

        // Create and initialize game
        game = new Game(playerType, socket);
        
        // Join game first
        socket.emit('join', playerType, (response: { success: boolean, error?: string }) => {
            if (response.success) {
                console.log('Successfully joined game');
                game?.init(); // Initialize the game after successful join
            } else {
                console.error('Failed to join game:', response.error);
                updateConnectionStatus(`Failed to join game: ${response.error}`);
                
                // Show menu again if join failed
                if (menu) menu.classList.add('active');
                game = null;
            }
        });
        
    } catch (error) {
        console.error('Error starting game:', error);
        updateConnectionStatus('Failed to start game. Please refresh the page.');
        
        // Show menu again if game failed to start
        const menu = document.getElementById('menu');
        if (menu) menu.classList.add('active');
        game = null;
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    if (game) {
        game.onWindowResize();
    }
});

// Handle visibility change to pause/resume game
document.addEventListener('visibilitychange', () => {
    if (game) {
        if (document.hidden) {
            game.pause();
        } else {
            game.resume();
        }
    }
}); 