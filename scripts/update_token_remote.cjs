require('dotenv').config();
const { Client } = require('ssh2');

const conn = new Client();
const newToken = process.env.TELEGRAM_BOT_TOKEN || process.argv[2] || '';
if (!newToken) {
  console.error('No TELEGRAM_BOT_TOKEN specified in .env or arguments');
  process.exit(1);
}

conn.on('ready', () => {
  console.log('Connected to server');
  const commands = [
    'cd /home/stepyn/sms-media',
    'git pull origin main',
    `sed -i 's/^TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=${newToken}/' .env`,
    `python3 -c "import json; p='server/bot_config.json'; f=open(p,'r+'); d=json.load(f); d['bot_token']='${newToken}'; f.seek(0); json.dump(d,f,indent=2); f.truncate()"`,
    'echo 1488 | sudo -S systemctl restart sms-sgtu.service',
    'sleep 2',
    'systemctl is-active sms-sgtu.service',
    'echo 1488 | sudo -S journalctl -u sms-sgtu.service -n 25 --no-pager'
  ];

  conn.exec(commands.join(' && '), (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', code => {
      console.log('\nRemote finished with exit code:', code);
      conn.end();
    });
  });
}).on('error', err => {
  console.error('Connection error:', err);
}).connect({
  host: '192.168.1.152',
  port: 22,
  username: 'stepyn',
  password: '1488'
});
