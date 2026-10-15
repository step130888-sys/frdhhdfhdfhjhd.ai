const path = require('path');
const fs = require('fs');
const db = require('../server/db');

async function cleanup() {
  console.log('--- Starting Data Cleanup ---');

  // 1. Initialize database and ensure admin exists
  await db.initDb();

  // 2. Ensure savanangelina exists and is properly configured
  let angelina = await db.get("SELECT * FROM users WHERE username = 'savanangelina'");
  if (!angelina) {
    console.log("Creating user 'savanangelina' (Ангелина Саван, 4 уровень, СММ)...");
    const passwordHash = db.hashPassword('1111');
    const res = await db.run(
      `INSERT INTO users (name, username, password_hash, role, access_level, is_approved, completed_tasks, average_score, can_create_tasks)
       VALUES (?, ?, ?, 'СММ', 4, 1, 0, 0.0, 1)`,
      ['Ангелина Саван', 'savanangelina', passwordHash]
    );
    angelina = await db.get("SELECT * FROM users WHERE id = ?", [res.lastID]);
  } else {
    console.log("Updating user 'savanangelina' to 4 level, СММ...");
    await db.run(
      `UPDATE users SET name = 'Ангелина Саван', role = 'СММ', access_level = 4, is_approved = 1, can_create_tasks = 1 WHERE username = 'savanangelina'`
    );
  }

  // Ensure admin is level 5, Хранитель
  await db.run(
    `UPDATE users SET name = 'Хранитель', role = 'Хранитель', access_level = 5, is_approved = 1, can_create_tasks = 1 WHERE username = 'admin'`
  );

  // 3. Clear all tasks and task comments in content plan
  console.log('Cleaning up all tasks and task comments...');
  const commentsDel = await db.run('DELETE FROM task_comments');
  const tasksDel = await db.run('DELETE FROM tasks');
  console.log(`Deleted ${tasksDel.changes} tasks and ${commentsDel.changes} comments.`);

  // 4. Delete all users except 'admin' and 'savanangelina'
  console.log("Deleting all profiles except 'admin' and 'savanangelina'...");
  const usersDel = await db.run(
    "DELETE FROM users WHERE username NOT IN ('admin', 'savanangelina')"
  );
  console.log(`Deleted ${usersDel.changes} profiles.`);

  // Reset counters for remaining users
  await db.run('UPDATE users SET completed_tasks = 0, average_score = 0.0');

  // Clean orphan records in foreign key tables
  const adminUser = await db.get("SELECT id FROM users WHERE username = 'admin'");
  if (adminUser) {
    await db.run('UPDATE work_materials SET uploaded_by_id = ? WHERE uploaded_by_id NOT IN (SELECT id FROM users)', [adminUser.id]);
    await db.run('DELETE FROM idea_comments WHERE user_id NOT IN (SELECT id FROM users)');
    await db.run('DELETE FROM ideas WHERE user_id NOT IN (SELECT id FROM users)');
    await db.run('DELETE FROM guardian_notes WHERE user_id NOT IN (SELECT id FROM users)');
  }

  // 5. Clean up telegram and vk bindings JSON files
  const tgPath = path.join(__dirname, '../server/telegram_bindings.json');
  if (fs.existsSync(tgPath)) {
    try {
      const tg = JSON.parse(fs.readFileSync(tgPath, 'utf8'));
      const newByChatId = {};
      const newByUserId = {};
      for (const [chatId, data] of Object.entries(tg.byChatId || {})) {
        if (data.username === 'admin' || data.username === 'savanangelina') {
          newByChatId[chatId] = data;
          newByUserId[String(data.userId)] = chatId;
        }
      }
      fs.writeFileSync(tgPath, JSON.stringify({ byChatId: newByChatId, byUserId: newByUserId }, null, 2), 'utf8');
      console.log('Cleaned server/telegram_bindings.json');
    } catch (e) {
      console.error('Failed to clean telegram_bindings:', e);
    }
  }

  const vkPath = path.join(__dirname, '../server/vk_bindings.json');
  if (fs.existsSync(vkPath)) {
    try {
      const vk = JSON.parse(fs.readFileSync(vkPath, 'utf8'));
      const newByVkId = {};
      const newByUserId = {};
      for (const [vkId, data] of Object.entries(vk.byVkId || {})) {
        if (data.username === 'admin' || data.username === 'savanangelina') {
          newByVkId[vkId] = data;
          newByUserId[String(data.userId)] = vkId;
        }
      }
      fs.writeFileSync(vkPath, JSON.stringify({ byVkId: newByVkId, byUserId: newByUserId }, null, 2), 'utf8');
      console.log('Cleaned server/vk_bindings.json');
    } catch (e) {
      console.error('Failed to clean vk_bindings:', e);
    }
  }

  // Verification output
  const remainingUsers = await db.all('SELECT id, name, username, role, access_level, is_approved, completed_tasks, average_score FROM users');
  console.log('\n--- Remaining Users in Database ---');
  console.table(remainingUsers);

  const remainingTasks = await db.get('SELECT COUNT(*) as c FROM tasks');
  console.log(`\nRemaining tasks in content plan: ${remainingTasks.c}`);

  console.log('\n--- Cleanup Finished Successfully ---');
}

cleanup().catch(err => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
