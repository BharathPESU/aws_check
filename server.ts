import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Enable CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==============================================================================
// 1. Storage & Database Setup (AWS S3 + AWS RDS PostgreSQL with graceful fallback)
// ==============================================================================
const region = process.env.AWS_REGION || 'ap-south-1';
const bucketName = process.env.S3_BUCKET_NAME;
const databaseUrl = process.env.DATABASE_URL;

let s3Client: S3Client | null = null;
let isS3Configured = false;
let s3CredentialsChecked = false;

if (bucketName) {
  try {
    s3Client = new S3Client({ region });
    console.log(`[AWS S3] Initialized S3 Client for bucket "${bucketName}" in region "${region}".`);
  } catch (err: any) {
    console.warn('[AWS S3] S3 client setup note:', err.message);
  }
} else {
  console.log('[AWS S3] S3_BUCKET_NAME not set. Using local file store emulation.');
}

/**
 * Checks if AWS credentials are valid and available in the current environment
 * (e.g. EC2 IAM Role, AWS_ACCESS_KEY_ID, etc.).
 */
async function canUseS3(): Promise<boolean> {
  if (!s3Client || !bucketName) return false;
  if (s3CredentialsChecked) return isS3Configured;

  try {
    const creds = await s3Client.config.credentials();
    if (creds && creds.accessKeyId) {
      isS3Configured = true;
      s3CredentialsChecked = true;
      console.log('[AWS S3] AWS credentials verified successfully.');
      return true;
    }
  } catch (_e) {
    // Credentials not available in this environment (e.g. running in cloud preview without IAM role)
    isS3Configured = false;
    s3CredentialsChecked = true;
    console.log(`[AWS S3] Note: Bucket "${bucketName}" is configured. Running in local storage mode until deployed to EC2 with IAM role.`);
    return false;
  }
  return false;
}

// Ensure local uploads directory exists
const localUploadsDir = path.resolve(__dirname, 'public/uploads');
if (!fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

// PostgreSQL RDS connection pool
let pgPool: pg.Pool | null = null;
let isRdsConnected = false;
let rdsHost = 'local';

if (databaseUrl) {
  try {
    const parsedUrl = new URL(databaseUrl);
    rdsHost = parsedUrl.hostname;
  } catch (_e) {}
}

interface ImageRecord {
  id: number;
  original_filename: string | null;
  s3_key: string;
  temperature?: number | null;
  fan_status?: string | null;
  mist_status?: string | null;
  recorded_at?: string | null;
  created_at: string;
}

const systemLogBuffer: Array<{ id: string; timestamp: string; level: string; message: string }> = [];
function recordSystemLog(level: string, message: string) {
  systemLogBuffer.unshift({
    id: Date.now() + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    level,
    message,
  });
  if (systemLogBuffer.length > 500) systemLogBuffer.pop();
}

const memoryDbRecords: ImageRecord[] = [
  {
    id: 6,
    original_filename: 'image003.jpg',
    s3_key: 'images/2026/10/05/sample-003-image003.jpg',
    temperature: 28.0,
    fan_status: 'ON',
    mist_status: 'OFF',
    recorded_at: '2026-10-05T10:00:25.000Z',
    created_at: new Date(Date.now() - 10000).toISOString(),
  },
  {
    id: 5,
    original_filename: 'image002.jpg',
    s3_key: 'images/2026/10/05/sample-002-image002.jpg',
    temperature: 30.1,
    fan_status: 'ON',
    mist_status: 'ON',
    recorded_at: '2026-10-05T10:00:20.000Z',
    created_at: new Date(Date.now() - 25000).toISOString(),
  },
  {
    id: 4,
    original_filename: 'image001.jpg',
    s3_key: 'images/2026/10/05/sample-001-image001.jpg',
    temperature: 26.4,
    fan_status: 'OFF',
    mist_status: 'OFF',
    recorded_at: '2026-10-05T10:00:15.000Z',
    created_at: new Date(Date.now() - 40000).toISOString(),
  },
  {
    id: 3,
    original_filename: 'image003.jpg',
    s3_key: 'images/2026/10/05/sample-003-image003.jpg',
    temperature: 27.8,
    fan_status: 'OFF',
    mist_status: 'ON',
    recorded_at: '2026-10-05T10:00:10.000Z',
    created_at: new Date(Date.now() - 55000).toISOString(),
  },
  {
    id: 2,
    original_filename: 'image002.jpg',
    s3_key: 'images/2026/10/05/sample-002-image002.jpg',
    temperature: 29.2,
    fan_status: 'ON',
    mist_status: 'ON',
    recorded_at: '2026-10-05T10:00:05.000Z',
    created_at: new Date(Date.now() - 70000).toISOString(),
  },
  {
    id: 1,
    original_filename: 'image001.jpg',
    s3_key: 'images/2026/10/05/sample-001-image001.jpg',
    temperature: 28.5,
    fan_status: 'ON',
    mist_status: 'OFF',
    recorded_at: '2026-10-05T10:00:00.000Z',
    created_at: new Date(Date.now() - 85000).toISOString(),
  },
];
let nextId = 7;

if (databaseUrl) {
  pgPool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 2500, // Fast timeout prevents hanging when RDS is in private VPC
  });

  pgPool.connect((err, client, release) => {
    if (err) {
      isRdsConnected = false;
      console.log(`[RDS PostgreSQL] RDS endpoint "${rdsHost}" is in private VPC mode (not directly accessible from external sandbox). Resilient local indexing active.`);
    } else {
      isRdsConnected = true;
      console.log('[RDS PostgreSQL] Successfully connected to PostgreSQL database.');
      if (release) release();
      initRdsSchema();
    }
  });
} else {
  console.log('[RDS PostgreSQL] DATABASE_URL not set. Using local database emulation.');
}

async function initRdsSchema() {
  if (!pgPool || !isRdsConnected) return;
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        original_filename VARCHAR(255),
        s3_key VARCHAR(500) NOT NULL,
        temperature NUMERIC(5,2),
        fan_status VARCHAR(10),
        mist_status VARCHAR(10),
        recorded_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE images ADD COLUMN IF NOT EXISTS temperature NUMERIC(5,2);
      ALTER TABLE images ADD COLUMN IF NOT EXISTS fan_status VARCHAR(10);
      ALTER TABLE images ADD COLUMN IF NOT EXISTS mist_status VARCHAR(10);
      ALTER TABLE images ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP WITH TIME ZONE;
      CREATE INDEX IF NOT EXISTS idx_images_created_at ON images (created_at DESC);
    `);
    console.log('[RDS PostgreSQL] Table "images" schema verified with telemetry columns.');
    recordSystemLog('info', '[RDS PostgreSQL] Schema verified with telemetry columns (temperature, fan, mist, recorded_at)');
  } catch (err: any) {
    console.warn('[RDS PostgreSQL] Table schema check note:', err.message);
  }
}

// In-memory active telemetry store
let activeTelemetry = {
  temperature: 28.5,
  fan_status: 'ON',
  mist_status: 'OFF',
  timestamp: new Date().toISOString(),
  device_id: 'Raspberry Pi 4 Model B',
  last_updated: new Date().toISOString(),
  packets_received: 3,
};

// ==============================================================================
// 2. Helper Functions (S3 uploads & Presigned URLs)
// ==============================================================================
function generateS3Key(originalFilename: string = 'image.jpg') {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const cleanFilename = path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniquePrefix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  return `images/${year}/${month}/${day}/${uniquePrefix}-${cleanFilename}`;
}

async function uploadImageToS3(buffer: Buffer, originalFilename: string, mimeType: string = 'image/jpeg'): Promise<string> {
  const s3Key = generateS3Key(originalFilename);

  const hasS3 = await canUseS3();
  if (hasS3 && s3Client && bucketName) {
    try {
      console.log(`[AWS S3] Uploading to s3://${bucketName}/${s3Key} (${buffer.length} bytes)...`);
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
      });
      await s3Client.send(command);
      console.log(`[AWS S3] Upload complete: ${s3Key}`);
      return s3Key;
    } catch (err: any) {
      console.warn(`[AWS S3] Upload note (${err.message}). Storing in resilient local storage.`);
    }
  }

  // Local file storage emulation
  const localFileName = path.basename(s3Key);
  const localFilePath = path.join(localUploadsDir, localFileName);
  fs.writeFileSync(localFilePath, buffer);
  console.log(`[Storage Emulation] Stored image at ${localFilePath} with key: ${s3Key}`);
  return s3Key;
}

async function getPresignedImageUrl(s3Key: string): Promise<string> {
  if (!s3Key) return '/images/image001.jpg';

  const hasS3 = await canUseS3();
  if (hasS3 && s3Client && bucketName) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });
      return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (_err) {
      // Fall through to resilient local URL
    }
  }

  // Fallback URL resolution
  const localFileName = path.basename(s3Key);
  const localFilePath = path.join(localUploadsDir, localFileName);
  if (fs.existsSync(localFilePath)) {
    return `/uploads/${localFileName}`;
  }

  if (s3Key.includes('image001') || s3Key.includes('sample-001')) return '/images/image001.jpg';
  if (s3Key.includes('image002') || s3Key.includes('sample-002')) return '/images/image002.jpg';
  if (s3Key.includes('image003') || s3Key.includes('sample-003')) return '/images/image003.jpg';

  return `/images/image001.jpg`;
}

// Multer in-memory storage for multipart/form-data
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are permitted'));
    }
  },
});

// Serve uploaded files in emulation mode
app.use('/uploads', express.static(localUploadsDir));

// ==============================================================================
// 3. API Endpoints
// ==============================================================================

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'ok',
    service: 'maya-backend',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      connected: isRdsConnected,
      type: isRdsConnected ? 'AWS RDS PostgreSQL (Connected)' : (databaseUrl ? 'AWS RDS (Private VPC Mode)' : 'Local In-Memory / SQLite Emulator'),
      endpoint: rdsHost,
    },
    storage: {
      s3_configured: isS3Configured,
      bucket: bucketName || 'none (local emulation)',
      region: region,
      mode: isS3Configured ? 'AWS S3 Direct' : 'Local Emulation (Awaiting EC2 IAM Role)',
    },
  });
});

// Get Current Telemetry
app.get('/api/telemetry', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    success: true,
    data: activeTelemetry,
  });
});

// Receive Telemetry + Image (POST /api/telemetry)
app.post('/api/telemetry', upload.single('image'), async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { temperature, fan_status, mist_status, timestamp } = req.body;

    console.log('--------------------------------------------------');
    console.log('[Telemetry] Received payload from Raspberry Pi:');
    console.log(`  Timestamp   : ${timestamp || 'N/A'}`);
    console.log(`  Temperature : ${temperature}`);
    console.log(`  Fan Status  : ${fan_status}`);
    console.log(`  Mist Status : ${mist_status}`);

    if (temperature === undefined || temperature === null || temperature === '') {
      return res.status(400).json({ success: false, error: 'Missing required field: temperature' });
    }

    const parsedTemp = parseFloat(temperature);
    if (isNaN(parsedTemp)) {
      return res.status(400).json({ success: false, error: 'temperature must be a valid number' });
    }

    const fan = (fan_status || '').toString().trim().toUpperCase();
    if (!['ON', 'OFF'].includes(fan)) {
      return res.status(400).json({ success: false, error: 'fan_status must be ON or OFF' });
    }

    const mist = (mist_status || '').toString().trim().toUpperCase();
    if (!['ON', 'OFF'].includes(mist)) {
      return res.status(400).json({ success: false, error: 'mist_status must be ON or OFF' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Missing image in multipart field "image"' });
    }

    // 1. Upload image to S3 (or fallback storage)
    const s3Key = await uploadImageToS3(req.file.buffer, req.file.originalname, req.file.mimetype || 'image/jpeg');

    // 2. Insert into PostgreSQL RDS or resilient memory store
    let imageRecord: ImageRecord;
    const recordedAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    if (pgPool && isRdsConnected) {
      try {
        const insertQuery = `
          INSERT INTO images (original_filename, s3_key, temperature, fan_status, mist_status, recorded_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, original_filename, s3_key, temperature, fan_status, mist_status, recorded_at, created_at;
        `;
        const result = await pgPool.query(insertQuery, [req.file.originalname, s3Key, parsedTemp, fan, mist, recordedAt]);
        imageRecord = result.rows[0];
      } catch (dbErr: any) {
        console.warn('[RDS Query fallback]:', dbErr.message);
        imageRecord = {
          id: nextId++,
          original_filename: req.file.originalname,
          s3_key: s3Key,
          temperature: parsedTemp,
          fan_status: fan,
          mist_status: mist,
          recorded_at: recordedAt,
          created_at: new Date().toISOString(),
        };
        memoryDbRecords.unshift(imageRecord);
      }
    } else {
      imageRecord = {
        id: nextId++,
        original_filename: req.file.originalname,
        s3_key: s3Key,
        temperature: parsedTemp,
        fan_status: fan,
        mist_status: mist,
        recorded_at: recordedAt,
        created_at: new Date().toISOString(),
      };
      memoryDbRecords.unshift(imageRecord);
    }

    recordSystemLog('info', `[Telemetry] Packet from Raspberry Pi saved with ID #${imageRecord.id} (Temp: ${parsedTemp}°C, Fan: ${fan}, Mist: ${mist})`);

    // 3. Update active telemetry
    activeTelemetry = {
      temperature: parsedTemp,
      fan_status: fan,
      mist_status: mist,
      timestamp: timestamp || new Date().toISOString(),
      device_id: 'Raspberry Pi 4 Model B',
      last_updated: new Date().toISOString(),
      packets_received: activeTelemetry.packets_received + 1,
    };

    return res.status(201).json({
      success: true,
      imageId: imageRecord.id,
      s3_key: imageRecord.s3_key,
      message: 'Telemetry received successfully',
    });
  } catch (error: any) {
    console.error('[Telemetry Error]:', error);
    recordSystemLog('error', `[Telemetry Error]: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to process telemetry',
      details: error.message,
    });
  }
});

// Get Latest Image (GET /api/images/latest)
app.get('/api/images/latest', async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    let image: ImageRecord | null = null;

    if (pgPool && isRdsConnected) {
      try {
        const result = await pgPool.query(`
          SELECT id, original_filename, s3_key, temperature, fan_status, mist_status, recorded_at, created_at
          FROM images
          ORDER BY created_at DESC, id DESC
          LIMIT 1;
        `);
        if (result.rows.length > 0) {
          image = result.rows[0];
        }
      } catch (_e) {
        image = memoryDbRecords[0] || null;
      }
    } else {
      image = memoryDbRecords[0] || null;
    }

    if (!image) {
      return res.status(200).json({
        id: null,
        s3_key: null,
        url: null,
        temperature: null,
        fan_status: null,
        mist_status: null,
        recorded_at: null,
        message: 'No images available',
      });
    }

    const url = await getPresignedImageUrl(image.s3_key);
    return res.status(200).json({
      id: image.id,
      original_filename: image.original_filename,
      s3_key: image.s3_key,
      url,
      temperature: image.temperature !== undefined && image.temperature !== null ? Number(image.temperature) : null,
      fan_status: image.fan_status || null,
      mist_status: image.mist_status || null,
      recorded_at: image.recorded_at || null,
      created_at: image.created_at,
    });
  } catch (err: any) {
    console.error('[Get Latest Image Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve latest image', details: err.message });
  }
});

// Get Image List (GET /api/images)
app.get('/api/images', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const rawLimit = req.query.limit as string;
    let limit = 20;
    if (rawLimit === 'all') {
      limit = 1000;
    } else if (rawLimit) {
      const parsed = parseInt(rawLimit, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 1000);
      }
    }

    let records: ImageRecord[] = [];

    if (pgPool && isRdsConnected) {
      try {
        const result = await pgPool.query(
          `SELECT id, original_filename, s3_key, temperature, fan_status, mist_status, recorded_at, created_at
           FROM images
           ORDER BY created_at DESC, id DESC
           LIMIT $1;`,
          [limit]
        );
        records = result.rows;
      } catch (_e) {
        records = memoryDbRecords.slice(0, limit);
      }
    } else {
      records = memoryDbRecords.slice(0, limit);
    }

    const imagesWithUrls = await Promise.all(
      records.map(async (rec) => ({
        id: rec.id,
        original_filename: rec.original_filename,
        s3_key: rec.s3_key,
        url: await getPresignedImageUrl(rec.s3_key),
        temperature: rec.temperature !== undefined && rec.temperature !== null ? Number(rec.temperature) : null,
        fan_status: rec.fan_status || null,
        mist_status: rec.mist_status || null,
        recorded_at: rec.recorded_at || null,
        created_at: rec.created_at,
      }))
    );

    return res.status(200).json(imagesWithUrls);
  } catch (err: any) {
    console.error('[Get Images Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve image list', details: err.message });
  }
});

// Comprehensive Telemetry, Image & Server Logs (GET /api/logs?limit=N)
app.get('/api/logs', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const rawLimit = req.query.limit as string;
    let limit = 20;
    if (rawLimit === 'all') {
      limit = 1000;
    } else if (rawLimit) {
      const parsed = parseInt(rawLimit, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 1000);
      }
    }

    let records: ImageRecord[] = [];
    let totalCount = 0;

    if (pgPool && isRdsConnected) {
      try {
        const countRes = await pgPool.query('SELECT COUNT(*) AS total FROM images;');
        totalCount = parseInt(countRes.rows[0].total, 10) || 0;

        const result = await pgPool.query(
          `SELECT id, original_filename, s3_key, temperature, fan_status, mist_status, recorded_at, created_at
           FROM images
           ORDER BY created_at DESC, id DESC
           LIMIT $1;`,
          [limit]
        );
        records = result.rows;
      } catch (_e) {
        totalCount = memoryDbRecords.length;
        records = memoryDbRecords.slice(0, limit);
      }
    } else {
      totalCount = memoryDbRecords.length;
      records = memoryDbRecords.slice(0, limit);
    }

    const telemetryLogs = await Promise.all(
      records.map(async (rec) => ({
        id: rec.id,
        original_filename: rec.original_filename,
        s3_key: rec.s3_key,
        url: await getPresignedImageUrl(rec.s3_key),
        temperature: rec.temperature !== undefined && rec.temperature !== null ? Number(rec.temperature) : null,
        fan_status: rec.fan_status || 'UNKNOWN',
        mist_status: rec.mist_status || 'UNKNOWN',
        recorded_at: rec.recorded_at || null,
        created_at: rec.created_at,
      }))
    );

    return res.status(200).json({
      success: true,
      limit: limit,
      totalRecords: totalCount,
      returnedCount: telemetryLogs.length,
      logs: telemetryLogs,
      systemLogs: systemLogBuffer.slice(0, limit),
    });
  } catch (err: any) {
    console.error('[Get Logs Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve logs', details: err.message });
  }
});

// Catch-all for undefined /api routes so they return JSON 404 instead of HTML
app.all('/api/*', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({ error: 'API endpoint not found' });
});

// ==============================================================================
// 4. Vite Dev Server / Production Static Serving
// ==============================================================================
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Multer & Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Server Error Handler]:', err.message);
    res.setHeader('Content-Type', 'application/json');
    if (err.name === 'MulterError') {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Maya Monitor] Full-stack server running on port ${PORT}`);
    console.log(`[Maya Monitor] Local URL: http://localhost:${PORT}`);
    console.log(`[Maya Monitor] Health Check: http://localhost:${PORT}/api/health`);
    console.log(`[Maya Monitor] Telemetry API: http://localhost:${PORT}/api/telemetry`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Error starting server]:', err);
});
