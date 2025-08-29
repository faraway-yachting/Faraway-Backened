import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Configure Cloudinary
let isConfigured = false;

const configureCloudinary = (): void => {
    const cloudName = process.env['CLOUDINARY_CLOUD_NAME'];
    const apiKey = process.env['CLOUDINARY_API_KEY'];
    const apiSecret = process.env['CLOUDINARY_API_SECRET'];

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary configuration is incomplete. Please check your environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
    });

    isConfigured = true;
};

interface CloudinaryResult {
    secure_url: string;
    public_id: string;
}

export const uploadToCloudinary = async (
    file: Express.Multer.File,
    folder: string = 'faraway'
): Promise<CloudinaryResult> => {
    // Configure Cloudinary if not already configured
    if (!isConfigured) {
        try {
            configureCloudinary();
        } catch (error) {
            throw new Error(`Failed to configure Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'auto'
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else if (result) {
                    resolve({
                        secure_url: result.secure_url,
                        public_id: result.public_id
                    });
                } else {
                    reject(new Error('Upload failed'));
                }
            }
        );

        streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
};

export default { uploadToCloudinary };
