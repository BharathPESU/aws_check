const multer = require('multer');

// Configure in-memory storage so image buffer is ready for S3 stream upload
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept standard image MIME types
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type: Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter: fileFilter,
});

module.exports = upload;
