const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary, getMissingCloudinaryEnvVars, isCloudinaryConfigured } = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "campus-lost-found",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type: "image"
  }
});

function imageFileFilter(_req, file, cb) {
  if (file.mimetype?.startsWith("image/")) {
    cb(null, true);
    return;
  }

  cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "image"));
}

function requireCloudinaryConfig(_req, res, next) {
  if (isCloudinaryConfigured()) {
    next();
    return;
  }

  res.status(500).json({
    error: "cloudinary_not_configured",
    message: `Missing Cloudinary environment variables: ${getMissingCloudinaryEnvVars().join(", ")}`
  });
}

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

module.exports = {
  upload,
  requireCloudinaryConfig
};
