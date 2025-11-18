import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import fs from "fs";

dotenv.config();

const resolveEnvValue = (...keys) => {
  for (const key of keys) {
    if (process.env[key]) {
      return process.env[key];
    }
  }
  return undefined;
};

const configureCloudinary = () => {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (cloudinaryUrl) {
    cloudinary.config(cloudinaryUrl);
    return;
  }

  const cloudName = resolveEnvValue(
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_NAME",
    "CLOUD_NAME"
  );
  const apiKey = resolveEnvValue(
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_KEY",
    "CLOUD_API_KEY"
  );
  const apiSecret = resolveEnvValue(
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_SECRET",
    "CLOUD_API_SECRET"
  );

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  } else if (process.env.NODE_ENV !== "test") {
    console.warn(
      "Cloudinary credentials are missing. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET."
    );
  }
};

configureCloudinary();

const ensureCloudinaryConfigured = () => {
  const currentConfig = cloudinary.config();
  if (
    !currentConfig?.cloud_name ||
    !currentConfig?.api_key ||
    !currentConfig?.api_secret
  ) {
    throw new Error(
      "Cloudinary credentials are missing. Please set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
    );
  }
};

/**
 * Upload file to Cloudinary
 * @param {Object|Buffer|Stream|string} file - Multer file object, buffer, stream, or path
 * @param {string} folder - Cloudinary folder path
 * @param {string} resourceType - Resource type: 'auto', 'image', 'raw', 'video'
 * @returns {Promise<Object>} Cloudinary upload result
 */
export const uploadToCloudinary = async (
  file,
  folder,
  resourceType = "auto"
) => {
  return new Promise((resolve, reject) => {
    try {
      ensureCloudinaryConfigured();
    } catch (configError) {
      return reject(configError);
    }

    const uploadOptions = {
      folder: folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
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
            console.error("Error cleaning up temp file:", cleanupError);
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
    } else if (typeof file === "string") {
      // Direct upload (string path)
      cloudinary.uploader.upload(file, uploadOptions, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    } else {
      reject(new Error("Invalid file type provided"));
    }
  });
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type: 'auto', 'image', 'raw', 'video'
 * @returns {Promise<Object>} Cloudinary delete result
 */
export const deleteFromCloudinary = async (
  publicId,
  resourceType = "image"
) => {
  return new Promise((resolve, reject) => {
    try {
      ensureCloudinaryConfigured();
    } catch (configError) {
      return reject(configError);
    }

    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
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
