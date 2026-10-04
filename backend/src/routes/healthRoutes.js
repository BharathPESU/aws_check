const express = require('express');
const router = express.Router();
const db = require('../db');
const s3Service = require('../services/s3Service');

// GET /api/health
router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const connected = db.isRdsConnected();
  const dbHost = db.getRdsHost ? db.getRdsHost() : 'local';

  res.status(200).json({
    status: 'ok',
    service: 'maya-backend',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      connected: connected,
      type: connected
        ? 'AWS RDS PostgreSQL (Connected)'
        : (process.env.DATABASE_URL ? 'AWS RDS (Private VPC Mode)' : 'Local In-Memory / SQLite Emulator'),
      endpoint: dbHost,
    },
    storage: {
      s3_configured: s3Service.isS3Configured(),
      bucket: s3Service.getBucketName() || 'none (local emulation)',
      region: s3Service.getRegion(),
      mode: s3Service.isS3Configured() ? 'AWS S3 Direct' : 'Local Emulation (Awaiting EC2 IAM Role)',
    },
  });
});

module.exports = router;
