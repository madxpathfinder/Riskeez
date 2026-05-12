module.exports = {
  apps: [
    {
      name: 'riskeez-api',
      cwd: '/var/www/riskeez/backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production'
      },
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/www/riskeez/logs/api-error.log',
      out_file: '/var/www/riskeez/logs/api-out.log',
      merge_logs: true
    }
  ]
}
