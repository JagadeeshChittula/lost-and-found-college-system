function getUploadedImageUrl(file) {
  const url = String(file?.path || "").trim();
  if (url.startsWith("https://res.cloudinary.com/")) {
    return url;
  }
  return "";
}

module.exports = { getUploadedImageUrl };
