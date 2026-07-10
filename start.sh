#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo " ╔════════════════════════════════╗"
echo " ║    🌙 沈度 · 本地服务器      ║"
echo " ╚════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到 Node.js，请先安装：https://nodejs.org"
    exit 1
fi

echo "[检查] Intiface Central 是否已启动？"
echo "  如果还没启动，请现在打开 Intiface Central 桌面版。"
echo "  按回车继续..."
read

# Install dependencies (first time only)
if [ ! -d "node_modules" ]; then
    echo "[安装] 正在安装依赖..."
    npm install
fi

echo "[启动] 正在启动服务器..."
echo ""
node server.js
