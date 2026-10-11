const { Client } = require('ssh2');

const SERVER_HOST = '192.168.1.152';
const SERVER_USER = 'stepyn';
const SERVER_PASS = '1488';

function runSuCommand(conn, rootPass, cmd) {
  return new Promise((resolve, reject) => {
    conn.shell((err, stream) => {
      if (err) return reject(err);

      let buffer = '';
      let authenticated = false;

      stream.write('su -\n');

      stream.on('data', (d) => {
        const text = d.toString();
        buffer += text;
        process.stdout.write(text);

        if (!authenticated && (text.includes('Пароль:') || text.includes('Password:'))) {
          stream.write(rootPass + '\n');
        }

        if (!authenticated && text.includes('root@')) {
          authenticated = true;
          // Send command as root
          stream.write(cmd + '\n');
          stream.write('exit\n');
        }
      });

      stream.on('close', () => {
        resolve(buffer);
      });
    });
  });
}

function runRemoteCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\n========================================`);
    console.log(`[EXEC] ${cmd.length > 120 ? cmd.substring(0, 120) + '...' : cmd}`);
    console.log(`========================================`);

    conn.exec(cmd, { pty: true }, (err, stream) => {
      if (err) return reject(err);

      let stdout = '';
      let stderr = '';

      stream.on('close', (code, signal) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          const error = new Error(`Command failed with code ${code}`);
          error.code = code;
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        }
      });

      stream.on('data', (data) => {
        const text = data.toString('utf8');
        stdout += text;
        process.stdout.write(text);
      });

      stream.stderr.on('data', (data) => {
        const text = data.toString('utf8');
        stderr += text;
        process.stderr.write(text);
      });
    });
  });
}

async function main() {
  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect({
      host: SERVER_HOST,
      port: 22,
      username: SERVER_USER,
      password: SERVER_PASS,
      readyTimeout: 30000
    });
  });

  console.log('✅ Connected to', SERVER_HOST);

  try {
    // Sudo is already configured
    console.log('🔍 Verifying passwordless sudo...');
    await runRemoteCommand(conn, 'sudo whoami');

    // 2. Install essential packages: git, curl, nginx, avahi-daemon, ufw
    console.log('📦 Updating package manager and installing git, curl, nginx, avahi-daemon...');
    await runRemoteCommand(conn, 'sudo apt-get update -y && sudo apt-get install -y git curl wget build-essential nginx avahi-daemon ufw');

    // 3. Install Node.js 20 LTS
    console.log('⚡ Checking/Installing Node.js 20 LTS...');
    await runRemoteCommand(conn, `
      if ! command -v node &> /dev/null || [[ "$(node -v)" != v20* ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
      fi
      echo "Node version: $(node -v)"
      echo "NPM version: $(npm -v)"
    `);

    // 4. Install Cloudflared (official Cloudflare Tunnel client)
    console.log('☁️ Installing cloudflared binary...');
    await runRemoteCommand(conn, `
      if ! command -v cloudflared &> /dev/null; then
        sudo curl -fsSL -L --output /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
        sudo chmod +x /usr/local/bin/cloudflared
      fi
      cloudflared --version
    `);

    // 5. Clone repository or pull latest
    console.log('📂 Setting up /home/stepyn/sms-media repository...');
    await runRemoteCommand(conn, `
      if [ ! -d "/home/stepyn/sms-media/.git" ]; then
        rm -rf /home/stepyn/sms-media
        git clone https://github.com/step130888-sys/frdhhdfhdfhjhd.ai.git /home/stepyn/sms-media
      else
        cd /home/stepyn/sms-media
        git fetch origin main
        git reset --hard origin/main
      fi
    `);

    // 6. Setup .env file
    console.log('⚙️ Configuring .env file...');
    await runRemoteCommand(conn, `
      cat << 'ENVEOF' > /home/stepyn/sms-media/.env
PORT=8000
TELEGRAM_BOT_TOKEN=8837250732:AAGS9Z_PoAuJQdQbDyFJ5us1ny1CmHSs0mc
TELEGRAM_BOT_USERNAME=ping_sstu_bot
VK_GROUP_TOKEN=vk1.a.1NRncMmJV8sIgetmmZ6y1qSw1g4lVRMdKPqwsayzNXgWKAH3GoJKeJxwexqXCCdclrjM-Hz5oX4LNcWLPJEij3ZpFv_5agxEPAGcwwpLB4X1bmTMvJ53fGLK7ZDoHhY1uqnxxT0Ment05EMpfjc_Moq4dEzg3vlKVtOos4g9fKqrFxS0onXXzVPUJwVOurmaipPBYtu-4qlU4Fkgxc6LYg
VK_GROUP_ID=242133035
ENVEOF
    `);

    // 7. Install dependencies & build Vite production bundle
    console.log('🔨 Installing npm dependencies and building frontend...');
    await runRemoteCommand(conn, `
      cd /home/stepyn/sms-media
      npm install --no-audit
      npm run build
    `);

    // 8. Setup SMS SGTU systemd service
    console.log('🛡️ Configuring /etc/systemd/system/sms-sgtu.service...');
    await runRemoteCommand(conn, `
      sudo tee /etc/systemd/system/sms-sgtu.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=SMS SGTU Media Platform
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=stepyn
WorkingDirectory=/home/stepyn/sms-media
ExecStart=/usr/bin/node /home/stepyn/sms-media/server.js
Restart=always
RestartSec=3
KillMode=process
Environment=NODE_ENV=production
EnvironmentFile=/home/stepyn/sms-media/.env

LimitNOFILE=65536
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sms-sgtu

[Install]
WantedBy=multi-user.target
SERVICEEOF

      sudo systemctl daemon-reload
      sudo systemctl enable sms-sgtu
      sudo systemctl restart sms-sgtu
    `);

    // 9. Setup Nginx reverse proxy (Port 80)
    console.log('🌐 Configuring Nginx reverse proxy on port 80...');
    await runRemoteCommand(conn, `
      sudo tee /etc/nginx/sites-available/sms-sgtu > /dev/null << 'NGINXEOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 100M;

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
NGINXEOF

      sudo rm -f /etc/nginx/sites-enabled/default
      sudo ln -sf /etc/nginx/sites-available/sms-sgtu /etc/nginx/sites-enabled/sms-sgtu
      sudo nginx -t
      sudo systemctl enable nginx
      sudo systemctl restart nginx
      sudo systemctl enable avahi-daemon
      sudo systemctl restart avahi-daemon
    `);

    // 10. Setup Cloudflare Tunnel persistent service
    console.log('☁️ Setting up Cloudflare Tunnel persistent service...');
    await runRemoteCommand(conn, `
      sudo tee /etc/systemd/system/cloudflared-quick-tunnel.service > /dev/null << 'CFEOF'
[Unit]
Description=Cloudflare Quick Tunnel for SMS SGTU
After=network-online.target sms-sgtu.service
Wants=network-online.target

[Service]
Type=simple
User=stepyn
ExecStart=/usr/local/bin/cloudflared tunnel --url http://127.0.0.1:80 --no-autoupdate
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cloudflared-tunnel

[Install]
WantedBy=multi-user.target
CFEOF

      sudo systemctl daemon-reload
      sudo systemctl enable cloudflared-quick-tunnel
      sudo systemctl restart cloudflared-quick-tunnel
    `);

    // 11. Wait for Cloudflare URL and display status
    console.log('🔍 Checking services and obtaining Cloudflare public link...');
    await runRemoteCommand(conn, `
      sleep 5
      sudo systemctl status sms-sgtu --no-pager -l || true
      sudo systemctl status nginx --no-pager -l || true
      
      echo "========================================================"
      echo "--- CLOUDFLARE PUBLIC URL ---"
      sudo journalctl -u cloudflared-quick-tunnel -n 50 --no-pager | grep -o 'https://[-a-zA-Z0-9@:%._+~#=]*.trycloudflare.com' | tail -n 1 || true
      echo "========================================================"
    `);

    console.log('\n🎉 ALL SERVICES DEPLOYED SUCCESSFULLY!');
  } finally {
    conn.end();
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal Setup Error:', err);
  process.exit(1);
});
