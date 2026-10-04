const db = require('../db');
const s3Service = require('../services/s3Service');

/**
 * GET /api/images/latest
 * Retrieves the most recent image record from PostgreSQL RDS and generates an S3 presigned URL.
 */
async function getLatestImage(req, res) {
  try {
    const query = `
      SELECT id, original_filename, s3_key, created_at
      FROM images
      ORDER BY created_at DESC, id DESC
      LIMIT 1;
    `;
    const result = await db.query(query);

    if (result.rows.length === 0) {
      return res.status(200).json({
        id: null,
        s3_key: null,
        url: null,
        message: 'No images available yet',
      });
    }

    const image = result.rows[0];
    const presignedUrl = await s3Service.getPresignedImageUrl(image.s3_key);

    return res.status(200).json({
      id: image.id,
      original_filename: image.original_filename,
      s3_key: image.s3_key,
      url: presignedUrl,
      created_at: image.created_at,
    });
  } catch (error) {
    console.error('[ImageController] Error fetching latest image:', error);
    return res.status(500).json({
      error: 'Failed to retrieve latest image',
      details: error.message,
    });
  }
}

/**
 * GET /api/images
 * Retrieves image history from PostgreSQL RDS with presigned URLs.
 */
async function getImages(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const query = `
      SELECT id, original_filename, s3_key, created_at
      FROM images
      ORDER BY created_at DESC, id DESC
      LIMIT $1;
    `;
    const result = await db.query(query, [limit]);

    // Generate presigned URLs concurrently
    const imagesWithUrls = await Promise.all(
      result.rows.map(async (img) => {
        const url = await s3Service.getPresignedImageUrl(img.s3_key);
        return {
          id: img.id,
          original_filename: img.original_filename,
          s3_key: img.s3_key,
          url: url,
          created_at: img.created_at,
        };
      })
    );

    return res.status(200).json(imagesWithUrls);
  } catch (error) {
    console.error('[ImageController] Error fetching images:', error);
    return res.status(500).json({
      error: 'Failed to retrieve image list',
      details: error.message,
    });
  }
}

module.exports = {
  getLatestImage,
  getImages,
};
