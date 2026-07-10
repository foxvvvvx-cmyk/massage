@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo   ====================================
echo         ShenDu Local Server
echo   ====================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js not found
    echo Install from: https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js detected:
node --version
echo.

if not exist "node_modules" (
    echo [*] Installing dependencies...
    call npm install
)

echo [*] Starting server...
echo.
node server.js
pause
