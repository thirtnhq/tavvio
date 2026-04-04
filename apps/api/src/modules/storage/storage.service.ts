import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiOptions,
} from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    const publicId = key.replace(/\.[^/.]+$/, '').replace(/\//g, '_');

    const options: UploadApiOptions = {
      public_id: publicId,
      resource_type: 'raw',
      overwrite: true,
      format: contentType === 'application/pdf' ? 'pdf' : undefined,
    };

    const result = await this.uploadBuffer(body, options);

    this.logger.log(`Uploaded file to Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  }

  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    this.logger.log(`Deleted file from Cloudinary: ${publicId}`);
  }

  // Cloudinary secure_url is permanent — no pre-signing needed.
  getSignedUrl(secureUrl: string): string {
    return secureUrl;
  }

  private uploadBuffer(
    buffer: Buffer,
    options: UploadApiOptions,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error ?? !result) {
            reject(
              new InternalServerErrorException(
                error?.message ?? 'Cloudinary upload failed',
              ),
            );
            return;
          }
          resolve(result);
        },
      );

      Readable.from(buffer).pipe(stream);
    });
  }
}
