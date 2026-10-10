@echo off
chcp 65001 >nul
title КЕДР СГТУ - Онлайн Платформа
echo ========================================================
echo   Медиацентр «КЕДР СГТУ» им. Гагарина Ю.А.
echo   Запуск платформы и генерация публичной ссылки...
echo ========================================================
echo.
set "NODE_CMD=%~dp0..\nodejs\node.exe"
if not exist "%NODE_CMD%" set "NODE_CMD=node"

echo [1/2] Запуск сервера Node.js...
start /b "" "%NODE_CMD%" "%~dp0server.js"
timeout /t 2 /nobreak >nul
echo.
echo [2/2] Подключение защищенного интернет-туннеля...
echo.
echo Скопируйте появившуюся ссылку https://...lhr.life и откройте в браузере!
echo (Не закрывайте это окно, пока пользуетесь сайтом)
echo.
ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:8000 nokey@localhost.run
pause
