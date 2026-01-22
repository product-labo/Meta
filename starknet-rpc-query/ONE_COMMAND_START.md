# 🎯 One-Command Startup - Ready!

## 🚀 Start Everything at Once:

```bash
./start-all.sh
```

## 📋 What This Does:

### ✅ Automatic Setup:
- Installs npm dependencies if needed
- Builds TypeScript code
- Creates log directories

### 🔄 Starts All Services:
1. **Data Fetcher & Sync** - Fetches 3 months of historical data + continuous sync
2. **Progress Monitor** - Real-time progress tracking
3. **Log Management** - Separate log files for each service

### 📊 Monitoring:
- **Live logs**: `tail -f logs/app.log` (main application)
- **Progress**: `tail -f logs/monitor.log` (sync progress)
- **Combined view**: Both services running in background

### 🛑 Stop Everything:
- Press `Ctrl+C` to gracefully shutdown all services

## 📁 File Structure After Start:
```
logs/
├── app.log      # Main application logs
└── monitor.log  # Progress monitoring logs
```

**One command starts the complete 3-month Starknet data sync system!** 🎉

Just run `./start-all.sh` and everything will be running in the background with proper logging.
