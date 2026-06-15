const fs = require('fs')
const path = require('path')

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

/**
 * Saves a base64 image to the filesystem.
 * @param {string} base64Data - The base64 data URI string (e.g. data:image/jpeg;base64,...)
 * @param {string} folder - The subfolder within uploads/ (e.g. 'owners' or 'students/uuid')
 * @param {string} filename - The name of the file (e.g. 'profile.jpg')
 * @returns {string} The relative URL path (e.g., '/api/documents/owners/1_profile.jpg')
 */
function saveBase64Image(base64Data, folder, filename) {
  if (!base64Data) return null
  
  // If it's not base64 data, just return it (might already be a URL or relative path)
  if (!base64Data.startsWith('data:image')) {
    return base64Data
  }

  // Parse the base64 string
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image data format')
  }

  const mimeType = matches[1]
  const buffer = Buffer.from(matches[2], 'base64')

  // Enforce file size limit of 2MB
  const MAX_SIZE = 2 * 1024 * 1024 // 2MB
  if (buffer.length > MAX_SIZE) {
    throw new Error('Image size exceeds the 2MB limit')
  }

  // Ensure target folder exists
  const targetDir = path.join(UPLOADS_DIR, folder)
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  const targetPath = path.join(targetDir, filename)
  fs.writeFileSync(targetPath, buffer)

  // Return the relative URL path
  return `/api/documents/${folder}/${filename}`
}

module.exports = {
  saveBase64Image,
  UPLOADS_DIR
}
