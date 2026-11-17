#!/bin/bash
# Глифомат — локальный запуск на маке. Двойной клик по этому файлу.
# Поднимает локальный сервер (камере нужен http://localhost, с file:// она не работает) и открывает браузер.
cd "$(dirname "$0")"
PORT=5173
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done
echo "Глифомат: http://localhost:$PORT  (закрой это окно, чтобы остановить)"
( sleep 1; open "http://localhost:$PORT" ) &
exec python3 -m http.server $PORT --bind 127.0.0.1
