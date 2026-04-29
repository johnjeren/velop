import pg from 'pg';
import fs from 'fs';

const { Client } = pg;
const envContent = fs.readFileSync('.env', 'utf-8');
const envConfig = Object.fromEntries(envContent.split('\n').filter(l => l.includes('=')).map(l => l.split('=')));
const dbPassword = envConfig.NEXT_PRIVATE_SUPABASE_DB_PASSWORD;

// Parse the project ref from the URL
const url = envConfig.NEXT_PUBLIC_SUPABASE_URL; // https://htgiizktbmihxdtexphn.supabase.co
const ref = url.split('//')[1].split('.')[0]; // htgiizktbmihxdtexphn

// The host is usually aws-0-[REGION].pooler.supabase.com. 
// We can try to use db.[ref].supabase.co which is the direct connection, but pooler is usually on port 6543.
// Let's try direct connection first. Direct connection uses port 5432 and host db.[ref].supabase.co
const directHost = `db.${ref}.supabase.co`;

async function testDB() {
  const client = new Client({
    host: directHost,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: dbPassword,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB!');
    
    // Check the trigger definition
    const res = await client.query(`
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'handle_new_user';
    `);
    console.log('Trigger def:', res.rows[0]?.pg_get_functiondef);

    // Check columns of profiles
    try {
      const profiles = await client.query(`
        SELECT id, display_name, household_id FROM profiles ORDER BY created_at DESC LIMIT 5;
      `);
      console.log('Recent profiles:', profiles.rows);
    } catch (e) {
      console.log('Query failed:', e.message);
    }

    await client.end();
  } catch (err) {
    console.error('DB Error:', err);
  }
}

testDB();
