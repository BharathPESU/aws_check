// ==============================================================================
// Maya Monitor - PM2 Process Manager Configuration
// Run on EC2: pm2 start ecosystem.config.js
// ==============================================================================

module.exports = {
  apps: [
    {
      name: 'maya-backend',
      script: './backend/src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/pm2-err.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
