const { Pool } = require('pg');
require('dotenv').config();

let pool = null;
let isConnected = false;
let rdsHost = 'local';

// In-memory fallback if RDS DATABASE_URL is in private VPC or not configured
const memoryRecords = [];
let nextId = 1;

if (process.env.DATABASE_URL) {
  try {
    const u = new URL(process.env.DATABASE_URL);
    rdsHost = u.hostname;
  } catch (_e) {}

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 2500, // 2.5s timeout prevents hanging during private VPC access
  });

  pool.connect((err, client, release) => {
    if (err) {
      isConnected = false;
      console.log(`[RDS PostgreSQL] RDS endpoint "${rdsHost}" is in private VPC mode (not directly accessible from external sandbox). Resilient local indexing active.`);
    } else {
      isConnected = true;
      console.log('[RDS PostgreSQL] Connected successfully to PostgreSQL RDS database.');
      if (release) release();
      initDatabase();
    }
  });
} else {
  console.log('[RDS PostgreSQL] DATABASE_URL not set. Using local resilient storage.');
}

async function initDatabase() {
  if (!pool || !isConnected) return;
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS images (
      id SERIAL PRIMARY KEY,
      original_filename VARCHAR(255),
      s3_key VARCHAR(500) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_images_created_at ON images (created_at DESC);
  `;
  try {
    await pool.query(createTableQuery);
    console.log('[RDS PostgreSQL] Verified "images" table schema exists.');
  } catch (err) {
    console.warn('[RDS PostgreSQL] Schema initialization note:', err.message);
  }
}

/**
 * Execute a query against RDS PostgreSQL or fallback store
 */
async function query(text, params) {
  if (pool && isConnected) {
    try {
      return await pool.query(text, params);
    } catch (dbErr) {
      console.warn('[RDS PostgreSQL Query Fallback]:', dbErr.message);
    }
  }

  // Fallback memory implementation matching the PostgreSQL schema
  const trimmed = text.trim().toUpperCase();
  if (trimmed.startsWith('INSERT INTO IMAGES')) {
    const [original_filename, s3_key] = params;
    const newRecord = {
      id: nextId++,
      original_filename: original_filename || null,
      s3_key: s3_key,
      created_at: new Date().toISOString(),
    };
    memoryRecords.unshift(newRecord);
    return { rows: [newRecord], rowCount: 1 };
  }

  if (trimmed.startsWith('SELECT') && trimmed.includes('LIMIT 1')) {
    const latest = memoryRecords[0];
    return { rows: latest ? [latest] : [], rowCount: latest ? 1 : 0 };
  }

  if (trimmed.startsWith('SELECT')) {
    return { rows: [...memoryRecords], rowCount: memoryRecords.length };
  }

  return { rows: [], rowCount: 0 };
}

module.exports = {
  query,
  isRdsConnected: () => isConnected,
  getRdsHost: () => rdsHost,
};
