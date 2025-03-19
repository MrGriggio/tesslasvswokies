module.exports = {
  apps: [{
    name: 'tesla-escape',
    script: 'src/server/index.ts',
    interpreter: './node_modules/.bin/ts-node',
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