# Indexing Workers Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying and managing the Multi-Chain Wallet Indexing workers in production environments. The indexing system consists of multiple components that work together to fetch, process, and store blockchain data.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer / Nginx                    │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │  API    │    │  API    │    │  API    │
    │ Server  │    │ Server  │    │ Server  │
    │ Node 1  │    │ Node 2  │    │ Node 3  │
    └────┬────┘    └────┬────┘    └────┬────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │  EVM    │    │Starknet │    │  ABI    │
    │ Indexer │    │ Indexer │    │ Parser  │
    │ Worker  │    │ Worker  │    │ Service │
    └────┬────┘    └────┬────┘    └────┬────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                    ┌────▼────┐
                    │PostgreSQL│
                    │ Database │
                    └──────────┘
```

## Prerequisites

### System Requirements

#### Minimum (Development/Testing)
- **OS**: Ubuntu 20.04 LTS or later
- **CPU**: 4 cores @ 2.5GHz
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Network**: 100 Mbps

#### Recommended (Production)
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 8 cores @ 3.0GHz
- **RAM**: 16GB
- **Storage**: 500GB NVMe SSD
- **Network**: 1 Gbps

#### High-Performance (Large Scale)
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 16+ cores @ 3.5GHz
- **RAM**: 32GB+
- **Storage**: 1TB+ NVMe SSD (RAID 10)
- **Network**: 10 Gbps with redundancy

### Software Requirements

```bash
# Node.js 18+
node --version  # Should be >= 18.0.0

# PostgreSQL 14+
psql --version  # Should be >= 14.0

# Redis 6+ (for job queue)
redis-cli --version  # Should be >= 6.0

# PM2 (process manager)
pm2 --version

# Nginx (reverse proxy)
nginx -v
```

## Installation Steps

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/prroduct-lab/meta.git
cd metagauge-indexing

# Checkout production branch
git checkout production
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm ci --production

# Install PM2 globally
npm install -g pm2

# Install PostgreSQL client tools
sudo apt-get install postgresql-client
```

### 3. Database Setup

```bash
# Create database
createdb metagauge_production

# Run migrations
npm run migrate:production

# Verify schema
psql metagauge_production -c "\dt"
```

### 4. Environment Configuration

Create production environment file:

```bash
# Copy example environment file
cp .env.example .env.production

# Edit with production values
nano .env.production
```

**Required Environment Variables:**

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/metagauge_production
DB_POOL_MIN=10
DB_POOL_MAX=50

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_here
JWT_EXPIRY=24h

# RPC Endpoints - Ethereum
ETHEREUM_RPC_PRIMARY=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ETHEREUM_RPC_FALLBACK=https://mainnet.infura.io/v3/YOUR_KEY
ETHEREUM_RPC_PUBLIC=https://ethereum.publicnode.com

# RPC Endpoints - Polygon
POLYGON_RPC_PRIMARY=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_FALLBACK=https://polygon-mainnet.infura.io/v3/YOUR_KEY
POLYGON_RPC_PUBLIC=https://polygon.llamarpc.com

# RPC Endpoints - Lisk
LISK_RPC_PRIMARY=https://rpc.api.lisk.com
LISK_RPC_FALLBACK=https://lisk.drpc.org

# RPC Endpoints - Arbitrum
ARBITRUM_RPC_PRIMARY=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_FALLBACK=https://arbitrum-mainnet.infura.io/v3/YOUR_KEY

# RPC Endpoints - Optimism
OPTIMISM_RPC_PRIMARY=https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY
OPTIMISM_RPC_FALLBACK=https://optimism-mainnet.infura.io/v3/YOUR_KEY

# RPC Endpoints - BSC
BSC_RPC_PRIMARY=https://bsc-dataseed1.binance.org
BSC_RPC_FALLBACK=https://bsc-dataseed2.binance.org

# RPC Endpoints - Starknet
STARKNET_RPC_PRIMARY=https://starknet-mainnet.g.alchemy.com/v2/YOUR_KEY
STARKNET_RPC_FALLBACK=https://starknet-mainnet.infura.io/v3/YOUR_KEY

# Indexing Configuration
MAX_CONCURRENT_JOBS=10
BATCH_SIZE=100
BLOCKS_PER_REQUEST=1000
RETRY_ATTEMPTS=3
RETRY_DELAY_MS=1000

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
LOG_LEVEL=info
METRICS_PORT=9090

# WebSocket Configuration
WS_PORT=8080
WS_MAX_CONNECTIONS=1000

# API Configuration
API_PORT=3000
API_RATE_LIMIT=100
```

### 5. PM2 Configuration

Create PM2 ecosystem file:

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './src/index.js',
      instances: 4,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '1G',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'evm-indexer-worker',
      script: './src/services/evmIndexerWorker.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'evm'
      },
      max_memory_restart: '2G',
      error_file: './logs/evm-worker-error.log',
      out_file: './logs/evm-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'starknet-indexer-worker',
      script: './src/services/starknetIndexerWorker.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'starknet'
      },
      max_memory_restart: '2G',
      error_file: './logs/starknet-worker-error.log',
      out_file: './logs/starknet-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'indexing-orchestrator',
      script: './src/services/indexingOrchestratorService.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production'
      },
      max_memory_restart: '1G',
      error_file: './logs/orchestrator-error.log',
      out_file: './logs/orchestrator-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'websocket-server',
      script: './src/services/indexerWebSocket.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        WS_PORT: 8080
      },
      max_memory_restart: '1G',
      error_file: './logs/websocket-error.log',
      out_file: './logs/websocket-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

### 6. Nginx Configuration

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/metagauge-indexing
```

```nginx
upstream api_backend {
    least_conn;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

upstream websocket_backend {
    server 127.0.0.1:8080;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=ws_limit:10m rate=10r/s;

server {
    listen 80;
    server_name api.metagauge.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.metagauge.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.metagauge.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.metagauge.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API Endpoints
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket Endpoint
    location /ws/ {
        limit_req zone=ws_limit burst=5 nodelay;
        
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Health Check Endpoint
    location /health {
        access_log off;
        proxy_pass http://api_backend;
    }

    # Metrics Endpoint (restrict access)
    location /metrics {
        allow 10.0.0.0/8;  # Internal network only
        deny all;
        proxy_pass http://127.0.0.1:9090;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/metagauge-indexing /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL Certificate Setup

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d api.metagauge.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

## Deployment

### Initial Deployment

```bash
# Start all services with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Follow the instructions provided by the command

# Check status
pm2 status
pm2 logs
```

### Verification

```bash
# Check API health
curl https://api.metagauge.com/health

# Check WebSocket connection
wscat -c wss://api.metagauge.com/ws/indexing/test-wallet-id

# Check database connections
psql metagauge_production -c "SELECT count(*) FROM pg_stat_activity;"

# Check worker logs
pm2 logs evm-indexer-worker --lines 100
pm2 logs starknet-indexer-worker --lines 100
```

## Monitoring and Maintenance

### Monitoring Setup

#### 1. PM2 Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

#### 2. Database Monitoring

```sql
-- Create monitoring user
CREATE USER monitoring WITH PASSWORD 'monitoring_password';
GRANT pg_monitor TO monitoring;

-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### 3. Application Metrics

Create metrics endpoint:

```javascript
// src/metrics.js
const prometheus = require('prom-client');

const register = new prometheus.Registry();

// Indexing metrics
const indexingJobsTotal = new prometheus.Counter({
  name: 'indexing_jobs_total',
  help: 'Total number of indexing jobs',
  labelNames: ['chain', 'status']
});

const indexingDuration = new prometheus.Histogram({
  name: 'indexing_duration_seconds',
  help: 'Duration of indexing jobs',
  labelNames: ['chain'],
  buckets: [10, 30, 60, 300, 600, 1800, 3600]
});

const blocksProcessed = new prometheus.Counter({
  name: 'blocks_processed_total',
  help: 'Total blocks processed',
  labelNames: ['chain']
});

register.registerMetric(indexingJobsTotal);
register.registerMetric(indexingDuration);
register.registerMetric(blocksProcessed);

module.exports = { register, indexingJobsTotal, indexingDuration, blocksProcessed };
```

### Backup Strategy

#### Database Backups

```bash
# Create backup script
cat > /opt/metagauge/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/metagauge"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/metagauge_$DATE.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump metagauge_production | gzip > $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "metagauge_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_FILE s3://metagauge-backups/database/

echo "Backup completed: $BACKUP_FILE"
EOF

chmod +x /opt/metagauge/backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /opt/metagauge/backup.sh
```

#### Application Backups

```bash
# Backup configuration and logs
tar -czf /var/backups/metagauge/config_$(date +%Y%m%d).tar.gz \
  /opt/metagauge/.env.production \
  /opt/metagauge/ecosystem.config.js \
  /opt/metagauge/logs/
```

### Log Management

```bash
# Configure logrotate
sudo nano /etc/logrotate.d/metagauge
```

```
/opt/metagauge/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Health Checks

Create health check script:

```bash
cat > /opt/metagauge/health-check.sh << 'EOF'
#!/bin/bash

# Check API health
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.metagauge.com/health)
if [ $API_STATUS -ne 200 ]; then
    echo "API health check failed: $API_STATUS"
    # Send alert
    curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
      -H 'Content-Type: application/json' \
      -d '{"text":"API health check failed"}'
fi

# Check database connections
DB_CONNECTIONS=$(psql metagauge_production -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='metagauge_production';")
if [ $DB_CONNECTIONS -gt 45 ]; then
    echo "High database connections: $DB_CONNECTIONS"
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "High disk usage: $DISK_USAGE%"
fi
EOF

chmod +x /opt/metagauge/health-check.sh

# Run every 5 minutes
crontab -e
# Add: */5 * * * * /opt/metagauge/health-check.sh
```

## Scaling

### Horizontal Scaling

#### Add More Worker Instances

```bash
# Scale EVM workers
pm2 scale evm-indexer-worker +2

# Scale API servers
pm2 scale api-server +2

# Verify scaling
pm2 status
```

#### Load Balancer Configuration

For multiple servers, use external load balancer:

```nginx
upstream api_backend {
    least_conn;
    server 10.0.1.10:3000 weight=1 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:3000 weight=1 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:3000 weight=1 max_fails=3 fail_timeout=30s;
}
```

### Vertical Scaling

#### Database Optimization

```sql
-- Increase shared buffers
ALTER SYSTEM SET shared_buffers = '4GB';

-- Increase work memory
ALTER SYSTEM SET work_mem = '16MB';

-- Increase maintenance work memory
ALTER SYSTEM SET maintenance_work_mem = '512MB';

-- Reload configuration
SELECT pg_reload_conf();
```

#### Application Optimization

```javascript
// Increase connection pool
const pool = new Pool({
  max: 100,  // Increase from 50
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Increase batch size
const BATCH_SIZE = 200;  // Increase from 100
```

## Troubleshooting

### Common Issues

#### High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart specific worker
pm2 restart evm-indexer-worker

# Reduce instances if needed
pm2 scale evm-indexer-worker 1
```

#### Database Connection Pool Exhausted

```sql
-- Check active connections
SELECT count(*), state FROM pg_stat_activity 
GROUP BY state;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND state_change < now() - interval '10 minutes';
```

#### RPC Rate Limiting

```bash
# Switch to fallback RPC
# Edit .env.production and swap PRIMARY/FALLBACK

# Restart workers
pm2 restart evm-indexer-worker
```

### Emergency Procedures

#### Complete System Restart

```bash
# Stop all services
pm2 stop all

# Restart database
sudo systemctl restart postgresql

# Restart Redis
sudo systemctl restart redis

# Start services
pm2 start all

# Verify
pm2 status
curl https://api.metagauge.com/health
```

#### Rollback Deployment

```bash
# Stop current version
pm2 stop all

# Checkout previous version
git checkout previous-release-tag

# Install dependencies
npm ci --production

# Start services
pm2 start ecosystem.config.js --env production
```

## Security Hardening

### Firewall Configuration

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL (internal only)
sudo ufw allow from 10.0.0.0/8 to any port 5432

# Enable firewall
sudo ufw enable
```

### Application Security

```bash
# Set proper file permissions
chmod 600 .env.production
chmod 700 /opt/metagauge/logs

# Run as non-root user
sudo useradd -r -s /bin/false metagauge
sudo chown -R metagauge:metagauge /opt/metagauge
```

## Support and Resources

- **Documentation**: https://docs.metagauge.com
- **Status Page**: https://status.metagauge.com
- **Support Email**: devops@metagauge.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX