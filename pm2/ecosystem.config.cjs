// ==============================================================================
// Maya Monitor - PM2 Process Manager Configuration (CommonJS)
// Run on EC2: pm2 start pm2/ecosystem.config.cjs
// ==============================================================================

const path = require('path');

module.exports = {
  apps: [
    {
      name: 'maya-backend',
      cwd: path.resolve(__dirname, '../backend'),
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: path.resolve(__dirname, '../logs/pm2-err.log'),
      out_file: path.resolve(__dirname, '../logs/pm2-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};

