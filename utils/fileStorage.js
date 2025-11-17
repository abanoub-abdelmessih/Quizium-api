// File storage utility for handling files in serverless vs regular environments
import path from 'path';

export const getFileUrl = (filePath) => {
  if (!filePath) return null;
  
  const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
  
  if (isServerless) {
    // In serverless, files in /tmp are not accessible via static URLs
    // You should use cloud storage (S3, Cloudinary, Vercel Blob) and store the URL
    // For now, return null or a placeholder
    // TODO: Implement cloud storage integration
    return null;
  }
  
  // In regular server, serve from uploads directory
  const filename = path.basename(filePath);
  const dir = filePath.includes('profiles') ? 'profiles' : 'images';
  return `/uploads/${dir}/${filename}`;
};

export const isServerless = () => {
  return process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
};

