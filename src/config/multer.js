const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'video/mp4',
]);

const storage = new CloudinaryStorage({
  cloudinary,
  params: () => ({
    folder: 'posts_media',
    resource_type: 'auto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4'],
    transformation: [{ fetch_format: 'auto', quality: 'auto' }],
  }),
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new Error('Only JPG, JPEG, PNG, GIF images and MP4 videos are allowed.')
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 5,
    fileSize: 15 * 1024 * 1024,
  },
});

module.exports = upload;
