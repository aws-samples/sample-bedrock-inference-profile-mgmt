#!/bin/bash

cd "$(dirname "$0")/../backend"

PORT=3010
PID_FILE=".app.pid"

echo "Stopping Bedrock Inference Profile Manager..."

# 方法1: 从 PID 文件读取
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    
    # 验证进程是否存在且是 Python 应用
    if ps -p "$PID" > /dev/null 2>&1; then
        PROCESS_CMD=$(ps -p "$PID" -o command= 2>/dev/null || ps -p "$PID" -o cmd= 2>/dev/null)
        
        if echo "$PROCESS_CMD" | grep -iq "python.*app.py"; then
            echo "Found application process: PID=$PID"
            kill "$PID" 2>/dev/null
            sleep 2
            
            # 如果还在运行，强制杀掉
            if ps -p "$PID" > /dev/null 2>&1; then
                kill -9 "$PID" 2>/dev/null
                sleep 1
            fi
            
            rm -f "$PID_FILE"
            echo "✅ Application stopped successfully"
            exit 0
        else
            echo "⚠️  PID $PID is not our Python app, cleaning up PID file"
            rm -f "$PID_FILE"
        fi
    else
        echo "⚠️  Process $PID not found, cleaning up PID file"
        rm -f "$PID_FILE"
    fi
fi

# 方法2: 通过端口查找
PID=$(lsof -i :"$PORT" -t 2>/dev/null)

if [ -z "$PID" ]; then
    echo "❌ No application running on port $PORT"
    exit 1
fi

# 验证是否是 Python 应用
PROCESS_CMD=$(ps -p "$PID" -o command= 2>/dev/null || ps -p "$PID" -o cmd= 2>/dev/null)

if echo "$PROCESS_CMD" | grep -iq "python.*app.py"; then
    echo "Found application on port $PORT: PID=$PID"
    kill "$PID" 2>/dev/null
    sleep 2
    
    if ps -p "$PID" > /dev/null 2>&1; then
        kill -9 "$PID" 2>/dev/null
        sleep 1
    fi
    
    echo "✅ Application stopped successfully"
    exit 0
else
    echo "⚠️  Port $PORT is used by another process (not our Python app):"
    echo "   PID: $PID"
    echo "   Command: $PROCESS_CMD"
    echo "❌ Refusing to stop non-Python process"
    exit 1
fi
