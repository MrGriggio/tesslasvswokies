# Tesla Escape - Multiplayer Game

A 3D multiplayer game where Tesla cars escape from hunters, built with Three.js, Socket.io, and TypeScript.

## Game Features

- Multiplayer support with Tesla cars and Hunters
- 3D environment with buildings, roads, and obstacles
- Physics-based movement and collision detection
- Special abilities including boost, shield, and flamethrower
- Custom controls with keyboard and mouse

## Development Setup

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/tesla-escape.git
   cd tesla-escape
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the development server
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Deployment

### Server Deployment

1. Connect to your server
   ```
   ssh root@your-server-ip
   ```

2. Clone the repository
   ```
   git clone https://github.com/yourusername/tesla-escape.git
   cd tesla-escape
   ```

3. Install dependencies
   ```
   npm install
   ```

4. Build the client
   ```
   npm run build
   ```

5. Set up Nginx
   ```
   apt install nginx
   nano /etc/nginx/sites-available/tesla-escape
   ```

6. Configure Nginx with this template:
   ```
   server {
       listen 80;
       server_name your-server-ip;

       location / {
           root /path/to/tesla-escape/dist/client;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       location /socket.io/ {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
       }
   }
   ```

7. Enable the configuration
   ```
   ln -s /etc/nginx/sites-available/tesla-escape /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

8. Start the game server with PM2
   ```
   npm install -g pm2
   pm2 start src/server/index.ts --interpreter="./node_modules/.bin/ts-node"
   pm2 save
   pm2 startup
   ```

## License

MIT License

## Credits

Created by [Your Name] 