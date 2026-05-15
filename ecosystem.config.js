module.exports = {
  apps: [{
    name: 'bolao',
    script: '/var/www/html/bolao/app/.next/standalone/server.js',
    env: {
      PORT: 3001,
      NODE_ENV: 'production',
    },
    restart_delay: 3000,
    max_restarts: 10,
  }],
};
