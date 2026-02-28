#!/bin/bash

cd "$(dirname "$0")/../backend"

PORT=3010
LOG_DIR="../logs"
LOG_FILE="$LOG_DIR/app_$(date +%Y%m%d_%H%M%S).log"
PID_FILE=".app.pid"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 检查端口是否被占用
check_port() {
    lsof -i :"$PORT" -t 2>/dev/null
}

# 强制重启
force_restart() {
    echo "Force restarting application..."
    PID=$(check_port)
    if [ ! -z "$PID" ]; then
        echo "Killing process $PID on port $PORT"
        kill -9 "$PID"
        sleep 1
    fi
    start_app
}

# 启动应用
start_app() {
    echo "Starting application on port $PORT..."
    echo "Log file: $LOG_FILE"
    nohup python app.py > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2
    
    if check_port > /dev/null; then
        echo "✅ Application started successfully"
        echo "   Access: http://localhost:$PORT"
        echo "   Log: tail -f $LOG_FILE"
    else
        echo "❌ Failed to start application"
        exit 1
    fi
}

# 主逻辑
if [ "$1" == "-f" ]; then
    force_restart
else
    if check_port > /dev/null; then
        echo "⚠️  Application already running on port $PORT"
        echo "   Use './start_app.sh -f' to force restart"
        echo "   Current log: $(ls -t ../logs/app_*.log | head -1)"
        exit 0
    else
        start_app
    fi
fi
