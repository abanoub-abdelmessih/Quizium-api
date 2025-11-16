# Vercel Deployment Guide

## Environment Variables

Make sure to set the following environment variables in your Vercel project settings:

1. **MONGODB_URI** - Your MongoDB Atlas connection string
   - Example: `mongodb+srv://username:password@cluster.mongodb.net/quizium?retryWrites=true&w=majority`

2. **JWT_SECRET** - A strong random string for JWT token signing
   - Generate a secure random string (at least 32 characters)

3. **EMAIL_USER** - Your email address for sending OTP emails
   - Example: `your-email@gmail.com`

4. **EMAIL_PASS** - Your email app password (for Gmail, use App Password, not regular password)
   - For Gmail: Go to Google Account > Security > 2-Step Verification > App Passwords

5. **NODE_ENV** - Set to `production` (optional, Vercel sets this automatically)

## Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add each variable with its value
4. Make sure to select the appropriate environments (Production, Preview, Development)

## File Uploads

**Important:** File uploads to local filesystem won't work in Vercel serverless functions because they are stateless. Files uploaded to `/tmp` are temporary and not accessible via static URLs.

### Current Implementation
- Files are uploaded to `/tmp` directory (temporary storage)
- File URLs will be `null` in serverless environment
- Files are stored in database but not accessible via URL

### Recommended Solution
For production, implement cloud storage:
- **Vercel Blob Storage** (recommended for Vercel)
- **AWS S3**
- **Cloudinary**
- **Google Cloud Storage**

Update `utils/fileStorage.js` to integrate with your chosen cloud storage service.

## Database Connection

The database connection is now optimized for serverless:
- Connections are cached to avoid creating new connections on each request
- Uses connection pooling
- Handles reconnection automatically

## Deployment Steps

1. Push your code to GitHub/GitLab/Bitbucket
2. Import the repository in Vercel
3. Set all environment variables in Vercel dashboard
4. Deploy

Vercel will automatically:
- Detect Node.js project
- Install dependencies
- Build and deploy

## Troubleshooting

### 500 Internal Server Error
- Check that all environment variables are set correctly
- Verify MongoDB connection string is correct
- Check Vercel function logs for detailed error messages

### Database Connection Issues
- Ensure MongoDB Atlas allows connections from Vercel IPs (0.0.0.0/0 for all)
- Verify connection string includes database name
- Check network access in MongoDB Atlas

### File Upload Issues
- Files upload successfully but URLs are null (expected in current implementation)
- Implement cloud storage for production use

