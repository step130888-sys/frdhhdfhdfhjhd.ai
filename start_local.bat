@echo off
chcp 65001 >nul
title КЕДР СГТУ - Локальный Сервер
echo ========================================================
echo   Медиацентр «КЕДР СГТУ» им. Гагарина Ю.А.
echo   Локальный запуск платформы (http://localhost:8000)
echo ========================================================
echo.
echo Сервер запущен. Нажмите Ctrl+C для остановки.
echo.
set "NODE_CMD=%~dp0..\nodejs\node.exe"
if not exist "%NODE_CMD%" set "NODE_CMD=node"

"%NODE_CMD%" "%~dp0server.js"
pause
