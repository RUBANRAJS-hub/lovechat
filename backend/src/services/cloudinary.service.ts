import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'mock_name' &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_KEY !== 'mock_key';

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.log('[Cloudinary Service] Cloudinary not configured. Falling back to local upload storage.');
  // Ensure local uploads directory exists
  const uploadDir = path.join(__dirname, '../../public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

export const uploadMedia = async (
  fileBuffer: Buffer,
  folder: string,
  fileName: string,
  mimeType: string
): Promise<string> => {
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `foreverus/${folder}`,
          resource_type: 'auto',
          public_id: path.parse(fileName).name + '_' + uuidv4().substring(0, 6),
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result?.secure_url || '');
        }
      );
      uploadStream.end(fileBuffer);
    });
  } else {
    // Local fallback
    const ext = path.extname(fileName) || '.bin';
    const generatedName = `${uuidv4()}${ext}`;
    const targetPath = path.join(__dirname, '../../public/uploads', generatedName);
    
    await fs.promises.writeFile(targetPath, fileBuffer);
    const port = process.env.PORT || 5000;
    return `http://localhost:${port}/uploads/${generatedName}`;
  }
};
