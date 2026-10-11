#!/bin/bash
set -e

# ========================================================
# 🌲 Скрипт автоматического развертывания «СМС СГТУ»
# OS: Ubuntu Server 22.04 / 24.04 LTS
# ========================================================

echo "========================================================"
echo "🚀 Запуск настройки сервера платформы «СМС СГТУ»..."
echo "========================================================"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_USER="$(whoami)"

echo "📂 Директория проекта: $APP_DIR"
echo "👤 Пользователь: $CURRENT_USER"

# 1. Обновление пакетов и установка зависимостей
echo "📦 Проверка системных пакетов..."
sudo apt-get update -y
sudo apt-get install -y curl git build-essential nginx avahi-daemon ufw

# 2. Установка Node.js 20 LTS (если не установлен)
if ! command -v node &> /dev/null || [[ "$(node -v)" != v20* ]]; then
    echo "⚡ Установка Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js: $(node -v) | npm: $(npm -v)"

# 3. Настройка файла окружения .env
if [ ! -f "$APP_DIR/.env" ]; then
    echo "⚙️ Создание файла .env с конфигурацией ботов..."
    cat << 'EOF' > "$APP_DIR/.env"
PORT=8000
TELEGRAM_BOT_TOKEN=8837250732:AAGS9Z_PoAuJQdQbDyFJ5us1ny1CmHSs0mc
TELEGRAM_BOT_USERNAME=ping_sstu_bot
VK_GROUP_TOKEN=vk1.a.1NRncMmJV8sIgetmmZ6y1qSw1g4lVRMdKPqwsayzNXgWKAH3GoJKeJxwexqXCCdclrjM-Hz5oX4LNcWLPJEij3ZpFv_5agxEPAGcwwpLB4X1bmTMvJ53fGLK7ZDoHhY1uqnxxT0Ment05EMpfjc_Moq4dEzg3vlKVtOos4g9fKqrFxS0onXXzVPUJwVOurmaipPBYtu-4qlU4Fkgxc6LYg
VK_GROUP_ID=242133035
EOF
fi

# 4. Установка npm зависимостей и компиляция Vite
echo "📦 Установка npm зависимостей..."
cd "$APP_DIR"
npm install --no-audit

echo "🔨 Сборка production бандла Vue 3..."
npm run build

# 5. Создание системной службы systemd для автозапуска и неубиваемости
echo "🛡️ Настройка автозапуска через systemd (авторестарт при падении)..."
sudo tee /etc/systemd/system/sms-sgtu.service > /dev/null << EOF
[Unit]
Description=SMS SGTU Media Platform
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$APP_DIR
ExecStart=$(which node) $APP_DIR/server.js
Restart=always
RestartSec=3
KillMode=process
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/.env

# Ограничения безопасности и стабильности
LimitNOFILE=65536
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sms-sgtu

[Install]
WantedBy=multi-user.target
EOF

# 6. Настройка Nginx в качестве обратного прокси на стандартный порт 80
echo "🌐 Настройка Nginx (порт 80)..."
sudo tee /etc/nginx/sites-available/sms-sgtu > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 100M;

    # Gzip сжатие в Nginx для ультра-быстрой отдачи
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# Удаляем дефолтный сайт nginx и активируем наш
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/sms-sgtu /etc/nginx/sites-enabled/sms-sgtu
sudo nginx -t

# 7. Настройка Firewall (UFW)
echo "🔒 Настройка портов фаервола..."
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 8000/tcp || true

# 8. Запуск и активация автозагрузки
echo "🚀 Активация и запуск служб..."
sudo systemctl daemon-reload
sudo systemctl enable sms-sgtu
sudo systemctl restart sms-sgtu

sudo systemctl enable nginx
sudo systemctl restart nginx

sudo systemctl enable avahi-daemon
sudo systemctl restart avahi-daemon

# Проверка статуса
sleep 2
if systemctl is-active --quiet sms-sgtu; then
    echo "========================================================"
    echo "🎉 ПЛАТФОРМА «СМС СГТУ» УСПЕШНО РАЗВЕРНУТА И РАБОТАЕТ!"
    echo "========================================================"
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    HOSTNAME_NAME=$(hostname)
    echo "📍 Адрес в локальной сети: http://$LOCAL_IP"
    echo "📍 Адрес по имени устройства: http://$HOSTNAME_NAME.local"
    echo "📍 Прямой порт Express: http://$LOCAL_IP:8000"
    echo ""
    echo "💡 Сервер настроен на автозапуск: при включении питания он"
    echo "   автоматически подымет сайт без вашего участия."
    echo "   Если сайт случайно упадет — systemd перезапустит его за 3 сек."
    echo "========================================================"
else
    echo "❌ Ошибка запуска службы. Проверьте логи: sudo journalctl -u sms-sgtu -n 50"
    exit 1
fi
