# Tesla vs. Hunters - Multiplayer 3D Game

A multiplayer web-based 3D game where Tesla cars try to escape from flame-throwing hunters in a modern city environment.

## Features

- Two playable roles:
  - Tesla: Fast electric car with boost ability
  - Hunter: Equipped with flame throwers to catch Teslas
- Modern city environment with buildings and hiding spots
- Real-time multiplayer using WebSocket
- Physics-based movement and collisions
- Boost and flame abilities with cooldown system
- AI-controlled enemies when not enough players

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Running the Game

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to `http://localhost:3000`

## Controls

### Both Roles
- W/A/S/D: Move
- Mouse: Look around
- Left Shift: Use boost (Tesla) or shoot flames (Hunter)
- Left Click: Lock mouse pointer

### Tesla
- 3 boost charges that recharge over time
- Higher top speed and acceleration
- More health points

### Hunter
- Flame thrower with cooldown
- Slightly slower movement
- Less health points

## Development

- Client: Three.js for 3D rendering
- Server: Node.js with Socket.IO for real-time communication
- Physics: Cannon.js for realistic movement and collisions

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## License

MIT 