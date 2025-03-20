module.exports = {
  apps: [{
    name: 'tesla-escape',
    script: './dist/server/index.js',
    interpreter: 'node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    exp_backoff_restart_delay: 100,
    max_restarts: 10,
    min_uptime: '5s'
  }]
};