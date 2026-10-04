const db = require('../db');
const s3Service = require('../services/s3Service');

// In-memory state to hold current active sensor readings received from Raspberry Pi
let currentTelemetry = {
  temperature: 28.5,
  fan_status: 'ON',
  mist_status: 'OFF',
  timestamp: new Date().toISOString(),
  device_id: 'Raspberry Pi 4 Model B',
  last_updated: new Date().toISOString(),
  packets_received: 0,
};

/**
 * POST /api/telemetry
 * Receives multipart/form-data telemetry and image from Raspberry Pi 4.
 */
async function receiveTelemetry(req, res) {
  try {
    const { temperature, fan_status, mist_status, timestamp } = req.body;

    console.log('--------------------------------------------------');
    console.log('[Telemetry] Received incoming payload from Raspberry Pi:');
    console.log(`  Timestamp   : ${timestamp || 'N/A'}`);
    console.log(`  Temperature : ${temperature} °C`);
    console.log(`  Fan Status  : ${fan_status}`);
    console.log(`  Mist Status : ${mist_status}`);

    // 1. Validate fields
    if (temperature === undefined || temperature === null || temperature === '') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: temperature',
      });
    }

    const parsedTemp = parseFloat(temperature);
    if (isNaN(parsedTemp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid temperature: must be a numeric value',
      });
    }

    if (!fan_status || !['ON', 'OFF'].includes(fan_status.toString().trim().toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing fan_status: must be ON or OFF',
      });
    }

    if (!mist_status || !['ON', 'OFF'].includes(mist_status.toString().trim().toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing mist_status: must be ON or OFF',
      });
    }

    // 2. Validate image file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Missing required image file in multipart field "image"',
      });
    }

    console.log(`[Telemetry] Image received: ${req.file.originalname} (${req.file.size} bytes)`);

    // 3. Upload image to S3
    const s3Key = await s3Service.uploadImageToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype || 'image/jpeg'
    );
    console.log('[Telemetry] Image uploaded to S3 with key:', s3Key);

    // 4. Store image ID and S3 object key in PostgreSQL RDS
    const insertQuery = `
      INSERT INTO images (original_filename, s3_key)
      VALUES ($1, $2)
      RETURNING id, original_filename, s3_key, created_at;
    `;
    const dbResult = await db.query(insertQuery, [req.file.originalname, s3Key]);
    const imageRecord = dbResult.rows[0];

    console.log('[Telemetry] Image record inserted into RDS with ID:', imageRecord.id);

    // 5. Update live active sensor telemetry state
    currentTelemetry = {
      temperature: parsedTemp,
      fan_status: fan_status.toString().trim().toUpperCase(),
      mist_status: mist_status.toString().trim().toUpperCase(),
      timestamp: timestamp || new Date().toISOString(),
      device_id: 'Raspberry Pi 4 Model B',
      last_updated: new Date().toISOString(),
      packets_received: currentTelemetry.packets_received + 1,
      latest_image_id: imageRecord.id,
      latest_s3_key: s3Key,
    };

    // 6. Return standard success response
    return res.status(201).json({
      success: true,
      imageId: imageRecord.id,
      s3_key: imageRecord.s3_key,
      message: 'Telemetry received successfully',
    });
  } catch (error) {
    console.error('[Telemetry] Error processing telemetry:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error processing telemetry',
      details: error.message,
    });
  }
}

/**
 * GET /api/telemetry
 * Returns current real-time telemetry metrics for the dashboard
 */
async function getTelemetry(req, res) {
  return res.json({
    success: true,
    data: currentTelemetry,
  });
}

module.exports = {
  receiveTelemetry,
  getTelemetry,
  getCurrentTelemetry: () => currentTelemetry,
};
