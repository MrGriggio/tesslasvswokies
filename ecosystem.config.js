module.exports = {
  apps: [{
    name: 'tesla-escape',
    script: './dist/server/index.js',
    interpreter: '/root/.nvm/versions/node/v22.14.0/bin/node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}; 