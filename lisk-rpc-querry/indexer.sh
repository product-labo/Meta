#!/bin/bash

# Lisk Indexer Production Runner
# This script runs the indexer continuously with proper error handling and monitoring

cd "$(dirname "$0")"

LOG_FILE="indexer.log"
PID_FILE="indexer.pid"

start_indexer() {
    echo "Starting Lisk Indexer..."
    nohup npx ts-node src/continuous-sync.ts >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "Indexer started with PID $(cat $PID_FILE)"
}

stop_indexer() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        echo "Stopping indexer (PID: $PID)..."
        kill "$PID" 2>/dev/null
        rm -f "$PID_FILE"
        echo "Indexer stopped"
    else
        echo "No PID file found"
    fi
}

status_indexer() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "Indexer is running (PID: $PID)"
            return 0
        else
            echo "Indexer is not running (stale PID file)"
            rm -f "$PID_FILE"
            return 1
        fi
    else
        echo "Indexer is not running"
        return 1
    fi
}

case "$1" in
    start)
        if status_indexer > /dev/null; then
            echo "Indexer is already running"
        else
            start_indexer
        fi
        ;;
    stop)
        stop_indexer
        ;;
    restart)
        stop_indexer
        sleep 2
        start_indexer
        ;;
    status)
        status_indexer
        ;;
    logs)
        tail -f "$LOG_FILE"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
