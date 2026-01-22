#!/bin/bash

INDEXER_PID_FILE="/tmp/starknet-indexer.pid"
LOG_FILE="./logs/indexer.log"

# Create logs directory if it doesn't exist
mkdir -p logs

case "$1" in
  start)
    if [ -f "$INDEXER_PID_FILE" ]; then
      PID=$(cat "$INDEXER_PID_FILE")
      if ps -p "$PID" > /dev/null 2>&1; then
        echo "❌ Indexer is already running (PID: $PID)"
        exit 1
      else
        echo "🧹 Removing stale PID file"
        rm -f "$INDEXER_PID_FILE"
      fi
    fi
    
    echo "🚀 Starting Continuous Starknet Indexer..."
    npm run build
    
    if [ $? -ne 0 ]; then
      echo "❌ Build failed"
      exit 1
    fi
    
    nohup node dist/continuous-indexer.js > "$LOG_FILE" 2>&1 &
    PID=$!
    echo $PID > "$INDEXER_PID_FILE"
    echo "✅ Indexer started (PID: $PID)"
    echo "📋 Logs: tail -f $LOG_FILE"
    ;;
    
  stop)
    if [ -f "$INDEXER_PID_FILE" ]; then
      PID=$(cat "$INDEXER_PID_FILE")
      if ps -p "$PID" > /dev/null 2>&1; then
        echo "🛑 Stopping indexer (PID: $PID)..."
        kill -TERM "$PID"
        sleep 2
        
        if ps -p "$PID" > /dev/null 2>&1; then
          echo "⚠️  Force killing indexer..."
          kill -KILL "$PID"
        fi
        
        rm -f "$INDEXER_PID_FILE"
        echo "✅ Indexer stopped"
      else
        echo "❌ Indexer is not running"
        rm -f "$INDEXER_PID_FILE"
      fi
    else
      echo "❌ No PID file found - indexer may not be running"
    fi
    ;;
    
  status)
    if [ -f "$INDEXER_PID_FILE" ]; then
      PID=$(cat "$INDEXER_PID_FILE")
      if ps -p "$PID" > /dev/null 2>&1; then
        echo "✅ Indexer is running (PID: $PID)"
        
        # Show recent activity
        if [ -f "$LOG_FILE" ]; then
          echo "📋 Recent activity:"
          tail -5 "$LOG_FILE"
        fi
      else
        echo "❌ Indexer is not running (stale PID file)"
        rm -f "$INDEXER_PID_FILE"
      fi
    else
      echo "❌ Indexer is not running"
    fi
    ;;
    
  logs)
    if [ -f "$LOG_FILE" ]; then
      tail -f "$LOG_FILE"
    else
      echo "❌ No log file found"
    fi
    ;;
    
  restart)
    $0 stop
    sleep 2
    $0 start
    ;;
    
  *)
    echo "Usage: $0 {start|stop|status|logs|restart}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the continuous indexer"
    echo "  stop    - Stop the continuous indexer"
    echo "  status  - Check indexer status"
    echo "  logs    - Follow indexer logs"
    echo "  restart - Restart the indexer"
    exit 1
    ;;
esac
