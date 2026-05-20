const cloudinary = require("cloudinary").v2;

const requiredEnvVars = ["CLOUD_NAME", "CLOUD_API_KEY", "CLOUD_API_SECRET"];

function getEnvValue(key) {
  return String(process.env[key] || "").trim();
}

function isPlaceholderValue(value) {
  return !value || value.startsWith("your_");
}

cloudinary.config({
  cloud_name: getEnvValue("CLOUD_NAME"),
  api_key: getEnvValue("CLOUD_API_KEY"),
  api_secret: getEnvValue("CLOUD_API_SECRET")
});

function getMissingCloudinaryEnvVars() {
  return requiredEnvVars.filter((key) => isPlaceholderValue(getEnvValue(key)));
}

function isCloudinaryConfigured() {
  return getMissingCloudinaryEnvVars().length === 0;
}

module.exports = {
  cloudinary,
  getMissingCloudinaryEnvVars,
  isCloudinaryConfigured
};
