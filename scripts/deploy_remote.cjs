const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection established');
  const cmd = `cd /home/stepyn/sms-media && git pull origin main && npm run build && echo 1488 | sudo -S systemctl restart sms-sgtu.service && systemctl is-active sms-sgtu.service`;
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log(`\nCommand finished with exit code: ${code}`);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('SSH error:', err);
}).connect({
  host: '192.168.1.152',
  port: 22,
  username: 'stepyn',
  password: '1488',
  readyTimeout: 15000
});
