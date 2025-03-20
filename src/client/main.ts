// Import crypto polyfill first, before any other imports
import '../polyfills/crypto.js';

import { io, Socket } from 'socket.io-client';
import { Game } from './game/Game';
import { PlayerType } from '../shared/types';

let game: Game | null = null;
let socket: Socket;

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

function connectToServer() {
    const serverAddress = `http://${window.location.hostname}:3000`;
    updateConnectionStatus(`Connecting to server...`);
    
    try {
        socket = io(serverAddress, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });

        socket.on('connect', () => {
            console.log('Connected to server!');
            updateConnectionStatus('Connected to server', true);
        });

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            updateConnectionStatus(`Connection error: ${error.message}`);
        });

        socket.on('disconnect', (reason) => {
            console.log('Disconnected:', reason);
            updateConnectionStatus('Disconnected from server');
            if (game) {
                game.dispose();
                game = null;
            }
        });

    } catch (error) {
        console.error('Error connecting to server:', error);
        updateConnectionStatus(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function startGame(playerName: string, team: 'tesla' | 'wookie') {
    try {
        console.log('Starting game as', playerName, 'with team', team);
        
        // Hide menu and connection status
        const menu = document.getElementById('menu');
        if (menu) menu.style.display = 'none';
        
        // Create and initialize game
        game = new Game(socket, playerName, team);
        game.init(); // Initialize the game
        
        // Hide login overlay
        const loginOverlay = document.getElementById('login-overlay');
        if (loginOverlay) {
            loginOverlay.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error starting game:', error);
        updateConnectionStatus('Failed to start game. Please refresh the page.');
        
        // Show login overlay again if game failed to start
        const loginOverlay = document.getElementById('login-overlay');
        if (loginOverlay) {
            loginOverlay.style.display = 'flex';
        }
        game = null;
    }
}

// Connect to server when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Connect to server first
    connectToServer();

    // Set up login handlers
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;
    const teslaButton = document.getElementById('tesla-button');
    const wookieButton = document.getElementById('wookie-button');
    const errorMessage = document.getElementById('error-message');

    function handleTeamSelection(team: 'tesla' | 'wookie') {
        const playerName = playerNameInput.value.trim();
        if (!playerName) {
            if (errorMessage) {
                errorMessage.style.display = 'block';
            }
            return;
        }
        if (!socket?.connected) {
            updateConnectionStatus('Waiting for server connection...');
            return;
        }
        startGame(playerName, team);
    }

    teslaButton?.addEventListener('click', () => handleTeamSelection('tesla'));
    wookieButton?.addEventListener('click', () => handleTeamSelection('wookie'));

    playerNameInput?.addEventListener('input', () => {
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    });
});

// Handle window resize
window.addEventListener('resize', () => {
    if (game) {
        game.onWindowResize();
    }
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (game) {
        if (document.hidden) {
            game.pause();
        } else {
            game.resume();
        }
    }
}); 