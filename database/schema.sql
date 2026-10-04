-- ==============================================================================
-- Maya Monitor - PostgreSQL RDS Schema
-- Database Table for Storing S3 Image References
-- ==============================================================================

-- Drop table if re-running migration
-- DROP TABLE IF EXISTS images;

CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    original_filename VARCHAR(255),
    s3_key VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast ordering by recency
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images (created_at DESC);

-- Optional comment on table
COMMENT ON TABLE images IS 'Stores S3 object keys and metadata for images received from Raspberry Pi telemetry';
