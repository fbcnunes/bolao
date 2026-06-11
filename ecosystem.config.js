const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return env;

      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex === -1) return env;

      const key = trimmed.slice(0, equalsIndex).trim();
      const value = trimmed.slice(equalsIndex + 1).trim();
      env[key] = value;
      return env;
    }, {});
}

const appEnv = loadEnvFile(path.join(__dirname, 'app/.env'));

module.exports = {
  apps: [{
    name: 'bolao',
    script: '/var/www/html/bolao/app/.next/standalone/server.js',
    env: {
      ...appEnv,
      PORT: 3001,
      NODE_ENV: 'production',
    },
    restart_delay: 3000,
    max_restarts: 10,
  }],
};
