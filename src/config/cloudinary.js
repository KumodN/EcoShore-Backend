const { v2: cloudinary } = require('cloudinary');

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME || '';
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.API_KEY || '';
const apiSecret =
  process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET || '';

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
} else {
  // Keep server booting for non-media routes; uploads will fail with a clear error.
  console.warn(
    '[cloudinary] Missing Cloudinary credentials. Set CLOUDINARY_* or CLOUD_NAME/API_KEY/API_SECRET variables.'
  );
}

module.exports = cloudinary;
