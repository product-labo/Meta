# Indexing Jobs Monitoring Dashboard

## Overview

This document describes the monitoring dashboard for Multi-Chain Wallet Indexing jobs, including metrics, alerts, and operational procedures. The dashboard provides real-time visibility into indexing performance, system health, and operational metrics.

## Dashboard Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Grafana Dashboard                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   System    │  │  Indexing   │  │   Chain     │        │
│  │  Overview   │  │ Performance │  │  Specific   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│                    Prometheus                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Node      │  │ Application │  │  Database   │        │
│  │  Exporter   │  │   Metrics   │  │   Metrics   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Key Performance Indicators (KPIs)

### Primary Metrics

1. **Indexing Throughput**
   - Blocks processed per second
   - Transactions indexed per minute
   - Events processed per minute

2. **System Health**
   - Active indexing jobs
   - Queue depth
   - Error rate percentage

3. **Resource Utilization**
   - CPU usage percentage
   - Memory consumption
   - Database connections

4. **Chain-Specific Performance**
   - Per-chain indexing speed
   - RPC response times
   - Chain-specific error rates

## Dashboard Panels

### 1. System Overview Panel

#### Metrics Displayed
- **Total Active Jobs**: Current number of running indexing jobs
- **Queue Depth**: Number of pending jobs waiting to start
- **Success Rate**: Percentage of successfully completed jobs (24h)
- **Average Job Duration**: Mean time to complete indexing jobs
- **System Uptime**: Application uptime percentage

#### Grafana Query Examples
```promql
# Active indexing jobs
sum(indexing_jobs_active{status="running"})

# Queue depth
sum(indexing_jobs_queued)

# Success rate (24h)
rate(indexing_jobs_completed{status="success"}[24h]) / 
rate(indexing_jobs_completed[24h]) * 100

# Average job duration
avg(indexing_job_duration_seconds)
```

### 2. Indexing Performance Panel

#### Metrics Displayed
- **Blocks Per Second**: Real-time block processing rate
- **Transactions Per Minute**: Transaction indexing throughput
- **Events Per Minute**: Event processing throughput
- **Processing Latency**: Time from block creation to indexing completion
- **Batch Processing Efficiency**: Percentage of successful batch operations

#### Grafana Queries
```promql
# Blocks per second
rate(blocks_processed_total[1m])

# Transactions per minute
rate(transactions_indexed_total[1m]) * 60

# Events per minute
rate(events_processed_total[1m]) * 60

# Processing latency
histogram_quantile(0.95, rate(indexing_latency_seconds_bucket[5m]))

# Batch efficiency
rate(batch_operations_success[5m]) / rate(batch_operations_total[5m]) * 100
```

### 3. Chain-Specific Performance Panel

#### Metrics by Chain
- **Ethereum**: Block processing rate, gas usage analysis
- **Polygon**: High-frequency transaction processing
- **Lisk**: L2 bridge transaction tracking
- **Arbitrum**: Rollup batch processing
- **Optimism**: Fraud proof monitoring
- **BSC**: Validator event tracking
- **Starknet**: Cairo transaction processing

#### Chain Comparison Queries
```promql
# Blocks per second by chain
sum(rate(blocks_processed_total[1m])) by (chain)

# Error rate by chain
sum(rate(indexing_errors_total[5m])) by (chain) / 
sum(rate(indexing_operations_total[5m])) by (chain) * 100

# RPC response time by chain
histogram_quantile(0.95, rate(rpc_request_duration_seconds_bucket[5m])) by (chain)
```

### 4. Error Monitoring Panel

#### Error Metrics
- **Error Rate**: Percentage of failed operations
- **Error Types**: Breakdown by error category
- **RPC Failures**: Connection and timeout errors
- **Database Errors**: Connection pool and query failures
- **Recovery Success Rate**: Percentage of successful retries

#### Error Tracking Queries
```promql
# Overall error rate
rate(indexing_errors_total[5m]) / rate(indexing_operations_total[5m]) * 100

# Errors by type
sum(rate(indexing_errors_total[5m])) by (error_type)

# RPC failure rate
rate(rpc_errors_total[5m]) / rate(rpc_requests_total[5m]) * 100

# Recovery success rate
rate(retry_operations_success[5m]) / rate(retry_operations_total[5m]) * 100
```

### 5. Resource Utilization Panel

#### System Resources
- **CPU Usage**: Per-core and aggregate utilization
- **Memory Usage**: RAM consumption and swap usage
- **Disk I/O**: Read/write operations and queue depth
- **Network I/O**: Bandwidth utilization and packet rates
- **Database Connections**: Active connections and pool utilization

#### Resource Queries
```promql
# CPU usage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk I/O
rate(node_disk_io_time_seconds_total[5m])

# Database connections
pg_stat_database_numbackends / pg_settings_max_connections * 100
```

### 6. WebSocket Connections Panel

#### Real-time Connection Metrics
- **Active WebSocket Connections**: Current connected clients
- **Connection Rate**: New connections per minute
- **Message Throughput**: Messages sent per second
- **Connection Duration**: Average session length
- **Disconnect Rate**: Disconnections per minute

#### WebSocket Queries
```promql
# Active connections
websocket_connections_active

# Connection rate
rate(websocket_connections_total[1m]) * 60

# Message throughput
rate(websocket_messages_sent_total[1m])

# Average connection duration
avg(websocket_connection_duration_seconds)
```

## Alert Configuration

### Critical Alerts (Immediate Response Required)

#### 1. High Error Rate Alert
```yaml
alert: HighIndexingErrorRate
expr: rate(indexing_errors_total[5m]) / rate(indexing_operations_total[5m]) > 0.1
for: 2m
labels:
  severity: critical
annotations:
  summary: "High indexing error rate detected"
  description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"
```

#### 2. Queue Backup Alert
```yaml
alert: IndexingQueueBackup
expr: sum(indexing_jobs_queued) > 100
for: 5m
labels:
  severity: critical
annotations:
  summary: "Indexing queue backup detected"
  description: "{{ $value }} jobs are queued, indicating processing bottleneck"
```

#### 3. Database Connection Pool Exhaustion
```yaml
alert: DatabaseConnectionPoolExhausted
expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.9
for: 1m
labels:
  severity: critical
annotations:
  summary: "Database connection pool nearly exhausted"
  description: "{{ $value | humanizePercentage }} of database connections are in use"
```

### Warning Alerts (Monitor Closely)

#### 1. Slow Indexing Performance
```yaml
alert: SlowIndexingPerformance
expr: rate(blocks_processed_total[5m]) < 10
for: 10m
labels:
  severity: warning
annotations:
  summary: "Indexing performance below threshold"
  description: "Processing {{ $value }} blocks per second, below 10 bps threshold"
```

#### 2. High Memory Usage
```yaml
alert: HighMemoryUsage
expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.8
for: 5m
labels:
  severity: warning
annotations:
  summary: "High memory usage detected"
  description: "Memory usage is {{ $value | humanizePercentage }}"
```

#### 3. RPC Response Time Degradation
```yaml
alert: HighRPCLatency
expr: histogram_quantile(0.95, rate(rpc_request_duration_seconds_bucket[5m])) > 5
for: 3m
labels:
  severity: warning
annotations:
  summary: "High RPC response times"
  description: "95th percentile RPC response time is {{ $value }}s"
```

## Dashboard Setup Instructions

### 1. Prometheus Configuration

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "indexing_alerts.yml"

scrape_configs:
  - job_name: 'indexing-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'indexing-workers'
    static_configs:
      - targets: ['localhost:3001', 'localhost:3002']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['localhost:9187']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### 2. Grafana Dashboard JSON

Create dashboard configuration:

```json
{
  "dashboard": {
    "id": null,
    "title": "Multi-Chain Wallet Indexing",
    "tags": ["indexing", "blockchain", "monitoring"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Active Indexing Jobs",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(indexing_jobs_active{status=\"running\"})",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 10},
                {"color": "red", "value": 50}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Blocks Processed Per Second",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(blocks_processed_total[1m])) by (chain)",
            "legendFormat": "{{chain}}",
            "refId": "A"
          }
        ],
        "yAxes": [
          {
            "label": "Blocks/sec",
            "min": 0
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "10s"
  }
}
```

### 3. Application Metrics Implementation

Add metrics to your application:

```javascript
// src/metrics/indexingMetrics.js
const prometheus = require('prom-client');

// Create metrics registry
const register = new prometheus.Registry();

// Job metrics
const indexingJobsActive = new prometheus.Gauge({
  name: 'indexing_jobs_active',
  help: 'Number of active indexing jobs',
  labelNames: ['status', 'chain']
});

const indexingJobsQueued = new prometheus.Gauge({
  name: 'indexing_jobs_queued',
  help: 'Number of queued indexing jobs',
  labelNames: ['chain']
});

const blocksProcessedTotal = new prometheus.Counter({
  name: 'blocks_processed_total',
  help: 'Total blocks processed',
  labelNames: ['chain']
});

const indexingJobDuration = new prometheus.Histogram({
  name: 'indexing_job_duration_seconds',
  help: 'Duration of indexing jobs',
  labelNames: ['chain', 'status'],
  buckets: [10, 30, 60, 300, 600, 1800, 3600, 7200]
});

const rpcRequestDuration = new prometheus.Histogram({
  name: 'rpc_request_duration_seconds',
  help: 'RPC request duration',
  labelNames: ['chain', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

// Register metrics
register.registerMetric(indexingJobsActive);
register.registerMetric(indexingJobsQueued);
register.registerMetric(blocksProcessedTotal);
register.registerMetric(indexingJobDuration);
register.registerMetric(rpcRequestDuration);

// Export metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

module.exports = {
  indexingJobsActive,
  indexingJobsQueued,
  blocksProcessedTotal,
  indexingJobDuration,
  rpcRequestDuration
};
```

### 4. Database Metrics Setup

Install and configure postgres_exporter:

```bash
# Download postgres_exporter
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.11.1/postgres_exporter-0.11.1.linux-amd64.tar.gz
tar xzf postgres_exporter-0.11.1.linux-amd64.tar.gz
sudo mv postgres_exporter-0.11.1.linux-amd64/postgres_exporter /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/postgres_exporter.service << EOF
[Unit]
Description=Postgres Exporter
After=network.target

[Service]
Type=simple
User=postgres
Environment=DATA_SOURCE_NAME="postgresql://monitoring:password@localhost:5432/metagauge_production?sslmode=disable"
ExecStart=/usr/local/bin/postgres_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl enable postgres_exporter
sudo systemctl start postgres_exporter
```

## Operational Procedures

### Daily Operations Checklist

#### Morning Health Check (9:00 AM)
- [ ] Review overnight alerts and incidents
- [ ] Check system resource utilization
- [ ] Verify all indexing workers are running
- [ ] Review error rates and investigate anomalies
- [ ] Check database performance metrics
- [ ] Verify backup completion status

#### Midday Performance Review (1:00 PM)
- [ ] Monitor indexing throughput trends
- [ ] Check queue depths and processing delays
- [ ] Review RPC endpoint performance
- [ ] Analyze chain-specific metrics
- [ ] Check WebSocket connection stability

#### Evening Summary (6:00 PM)
- [ ] Generate daily performance report
- [ ] Review capacity planning metrics
- [ ] Check log rotation and cleanup
- [ ] Verify monitoring system health
- [ ] Plan any maintenance activities

### Weekly Operations

#### Monday: Capacity Planning
- Review resource utilization trends
- Analyze growth patterns
- Plan scaling activities
- Update capacity forecasts

#### Wednesday: Performance Optimization
- Analyze slow queries and optimize
- Review indexing efficiency metrics
- Tune worker configurations
- Update RPC endpoint priorities

#### Friday: Maintenance and Updates
- Apply security patches
- Update dependencies
- Review and update alerts
- Backup configuration changes

### Incident Response Procedures

#### Severity 1: Critical System Down
1. **Immediate Response (0-5 minutes)**
   - Acknowledge alert
   - Check system status dashboard
   - Verify database connectivity
   - Check all worker processes

2. **Investigation (5-15 minutes)**
   - Review recent deployments
   - Check system logs for errors
   - Verify external dependencies (RPC endpoints)
   - Assess impact scope

3. **Resolution (15-60 minutes)**
   - Implement immediate fixes
   - Restart failed services
   - Switch to backup systems if needed
   - Monitor recovery progress

4. **Post-Incident (1-24 hours)**
   - Document incident details
   - Conduct root cause analysis
   - Update monitoring and alerts
   - Implement preventive measures

#### Severity 2: Performance Degradation
1. **Response (0-15 minutes)**
   - Acknowledge alert
   - Check performance metrics
   - Identify affected components

2. **Investigation (15-30 minutes)**
   - Analyze resource utilization
   - Check for bottlenecks
   - Review recent changes

3. **Resolution (30-120 minutes)**
   - Optimize configurations
   - Scale resources if needed
   - Implement performance fixes

### Troubleshooting Guide

#### High Queue Depth
**Symptoms**: Large number of pending jobs
**Possible Causes**:
- Worker process failures
- Database connection issues
- RPC endpoint problems
- Resource constraints

**Resolution Steps**:
1. Check worker process status: `pm2 status`
2. Verify database connections: `psql -c "SELECT count(*) FROM pg_stat_activity;"`
3. Test RPC endpoints: `curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' $RPC_URL`
4. Scale workers if needed: `pm2 scale evm-indexer-worker +2`

#### High Error Rate
**Symptoms**: Increased failure percentage
**Possible Causes**:
- RPC rate limiting
- Network connectivity issues
- Invalid contract addresses
- Database constraint violations

**Resolution Steps**:
1. Check error logs: `pm2 logs --lines 100`
2. Verify RPC endpoint status
3. Check database error logs: `tail -f /var/log/postgresql/postgresql-14-main.log`
4. Switch to fallback RPC if needed

#### Memory Leaks
**Symptoms**: Gradually increasing memory usage
**Possible Causes**:
- Unclosed database connections
- Large object retention
- Event listener leaks

**Resolution Steps**:
1. Monitor memory usage: `pm2 monit`
2. Restart affected processes: `pm2 restart worker-name`
3. Check for connection leaks in application code
4. Implement memory usage alerts

## Performance Optimization

### Database Optimization

#### Index Optimization
```sql
-- Analyze query performance
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Create optimized indexes
CREATE INDEX CONCURRENTLY idx_wallet_transactions_wallet_block 
ON wallet_transactions(wallet_id, block_number DESC);

CREATE INDEX CONCURRENTLY idx_indexing_jobs_status_created 
ON indexing_jobs(status, created_at) 
WHERE status IN ('queued', 'running');
```

#### Connection Pool Tuning
```javascript
// Optimize connection pool settings
const pool = new Pool({
  max: 50,                    // Maximum connections
  min: 10,                    // Minimum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout for new connections
  acquireTimeoutMillis: 60000,   // Timeout for acquiring connection
  createTimeoutMillis: 30000,    // Timeout for creating connection
  destroyTimeoutMillis: 5000,    // Timeout for destroying connection
  reapIntervalMillis: 1000,      // Check for idle connections every 1s
  createRetryIntervalMillis: 200 // Retry connection creation every 200ms
});
```

### Application Optimization

#### Batch Processing Optimization
```javascript
// Optimize batch sizes based on chain characteristics
const BATCH_SIZES = {
  ethereum: 100,    // Lower due to larger blocks
  polygon: 500,     // Higher due to faster blocks
  lisk: 300,        // Medium batch size
  arbitrum: 1000,   // Very high due to fast blocks
  starknet: 50      // Lower due to complex processing
};

// Implement adaptive batch sizing
function getOptimalBatchSize(chain, currentPerformance) {
  const baseBatchSize = BATCH_SIZES[chain];
  const performanceMultiplier = currentPerformance > 50 ? 1.2 : 0.8;
  return Math.floor(baseBatchSize * performanceMultiplier);
}
```

#### Memory Management
```javascript
// Implement memory-efficient processing
async function processBlocksBatch(blocks) {
  const results = [];
  
  // Process in smaller chunks to prevent memory buildup
  for (let i = 0; i < blocks.length; i += 10) {
    const chunk = blocks.slice(i, i + 10);
    const chunkResults = await processChunk(chunk);
    results.push(...chunkResults);
    
    // Force garbage collection periodically
    if (i % 100 === 0 && global.gc) {
      global.gc();
    }
  }
  
  return results;
}
```

## Reporting and Analytics

### Daily Reports

Generate automated daily reports:

```javascript
// Daily performance report
async function generateDailyReport() {
  const report = {
    date: new Date().toISOString().split('T')[0],
    metrics: {
      totalJobsCompleted: await getTotalJobsCompleted(),
      averageJobDuration: await getAverageJobDuration(),
      totalBlocksProcessed: await getTotalBlocksProcessed(),
      errorRate: await getErrorRate(),
      systemUptime: await getSystemUptime()
    },
    chainMetrics: await getChainSpecificMetrics(),
    alerts: await getAlertsTriggered(),
    recommendations: await generateRecommendations()
  };
  
  // Send report via email/Slack
  await sendReport(report);
}
```

### Weekly Trends Analysis

```javascript
// Weekly trends analysis
async function generateWeeklyTrends() {
  const trends = {
    performanceTrends: await getPerformanceTrends(7),
    resourceUtilizationTrends: await getResourceTrends(7),
    errorTrends: await getErrorTrends(7),
    capacityProjections: await getCapacityProjections(),
    optimizationOpportunities: await identifyOptimizations()
  };
  
  return trends;
}
```

## Support and Escalation

### Contact Information
- **Primary On-Call**: +1-XXX-XXX-XXXX
- **Secondary On-Call**: +1-XXX-XXX-XXXX
- **Engineering Manager**: engineering-manager@metagauge.com
- **DevOps Team**: devops@metagauge.com

### Escalation Matrix
- **Severity 1**: Immediate escalation to on-call engineer
- **Severity 2**: Escalate if not resolved within 2 hours
- **Severity 3**: Escalate if not resolved within 24 hours

### External Dependencies
- **RPC Providers**: Alchemy, Infura support channels
- **Cloud Provider**: AWS/GCP support
- **Database Support**: PostgreSQL community/enterprise support