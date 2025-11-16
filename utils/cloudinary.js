import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload file to Cloudinary
 * @param {Object|Buffer|Stream|string} file - Multer file object, buffer, stream, or path
 * @param {string} folder - Cloudinary folder path
 * @param {string} resourceType - Resource type: 'auto', 'image', 'raw', 'video'
 * @returns {Promise<Object>} Cloudinary upload result
 */
export const uploadToCloudinary = async (file, folder, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true
    };

    // If file is a multer file object (has path property)
    if (file && file.path) {
      // Read file as buffer and upload
      const fileBuffer = fs.readFileSync(file.path);
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          // Clean up temp file
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (cleanupError) {
            console.error('Error cleaning up temp file:', cleanupError);
          }
          
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      Readable.from(fileBuffer).pipe(stream);
    } else if (Buffer.isBuffer(file)) {
      // If file is a buffer, convert to stream
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      Readable.from(file).pipe(stream);
    } else if (typeof file === 'string') {
      // Direct upload (string path)
      cloudinary.uploader.upload(file, uploadOptions, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    } else {
      reject(new Error('Invalid file type provided'));
    }
  });
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type: 'auto', 'image', 'raw', 'video'
 * @returns {Promise<Object>} Cloudinary delete result
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} Public ID or null
 */
export const extractPublicId = (url) => {
  if (!url) return null;
  
  // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{version}/{public_id}.{format}
  const match = url.match(/\/upload\/[^\/]+\/([^\.]+)/);
  return match ? match[1] : null;
};

export default cloudinary;

