const db = require('../db');
const s3Service = require('../services/s3Service');
const logService = require('../services/logService');

/**
 * GET /api/logs
 * Retrieves telemetry and image logs from PostgreSQL RDS with presigned S3 URLs,
 * filtered by user-defined limit, plus server system diagnostics.
 */
async function getLogs(req, res) {
  try {
    const rawLimit = req.query.limit;
    // Support limit=all or numeric limit (default 20, max 1000)
    let limit = 20;
    if (rawLimit === 'all') {
      limit = 1000;
    } else if (rawLimit) {
      const parsed = parseInt(rawLimit, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 1000);
      }
    }

    // 1. Get total record count
    let totalCount = 0;
    try {
      const countResult = await db.query('SELECT COUNT(*) AS total FROM images;');
      if (countResult && countResult.rows && countResult.rows[0]) {
        totalCount = parseInt(countResult.rows[0].total, 10) || 0;
      }
    } catch (_e) {}

    // 2. Fetch records with the requested limit
    const query = `
      SELECT id, original_filename, s3_key, temperature, fan_status, mist_status, recorded_at, created_at
      FROM images
      ORDER BY created_at DESC, id DESC
      LIMIT $1;
    `;
    const result = await db.query(query, [limit]);

    // 3. Attach presigned URLs
    const telemetryLogs = await Promise.all(
      result.rows.map(async (row) => {
        const presignedUrl = await s3Service.getPresignedImageUrl(row.s3_key);
        return {
          id: row.id,
          original_filename: row.original_filename,
          s3_key: row.s3_key,
          url: presignedUrl,
          temperature: row.temperature !== null && row.temperature !== undefined ? parseFloat(row.temperature) : null,
          fan_status: row.fan_status || 'UNKNOWN',
          mist_status: row.mist_status || 'UNKNOWN',
          recorded_at: row.recorded_at,
          created_at: row.created_at,
        };
      })
    );

    // 4. Retrieve recent server system event logs
    const sysLogs = logService.getSystemLogs(limit);

    return res.status(200).json({
      success: true,
      limit: limit,
      totalRecords: totalCount || telemetryLogs.length,
      returnedCount: telemetryLogs.length,
      logs: telemetryLogs,
      systemLogs: sysLogs,
    });
  } catch (error) {
    console.error('[LogController] Error retrieving logs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve logs',
      details: error.message,
    });
  }
}

module.exports = {
  getLogs,
};
