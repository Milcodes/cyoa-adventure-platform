import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

/**
 * MediaService
 *
 * Handles file uploads and management with S3/MinIO:
 * - File upload to S3-compatible storage
 * - Presigned URL generation
 * - File deletion
 * - File metadata management
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/webm',
    'video/ogg',
    // Audio
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    // Documents (for reference)
    'application/pdf',
  ];

  constructor(private readonly configService: ConfigService) {
    // Initialize S3 client
    this.s3Client = new S3Client({
      endpoint: this.configService.get<string>('s3.endpoint')!,
      region: 'us-east-1', // MinIO doesn't care about region
      credentials: {
        accessKeyId: this.configService.get<string>('s3.accessKey')!,
        secretAccessKey: this.configService.get<string>('s3.secretKey')!,
      },
      forcePathStyle: true, // Required for MinIO
    });

    this.bucket = this.configService.get<string>('s3.bucket')!;
  }

  /**
   * Upload a file to S3
   *
   * @param file - Uploaded file from multer
   * @param userId - User ID (uploader)
   * @param storyId - Optional story ID for organization
   * @returns Upload result with file URL and metadata
   */
  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    storyId?: string,
  ): Promise<{
    fileId: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    size: number;
  }> {
    // Validate file
    this.validateFile(file);

    // Generate unique file ID
    const fileId = uuidv4();
    const fileExtension = this.getFileExtension(file.originalname);
    const fileName = `${fileId}${fileExtension}`;

    // Create S3 key with organization
    const key = storyId
      ? `stories/${storyId}/${fileName}`
      : `uploads/${userId}/${fileName}`;

    try {
      // Upload to S3
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            'uploaded-by': userId,
            'original-name': file.originalname,
            ...(storyId && { 'story-id': storyId }),
          },
        }),
      );

      this.logger.log(`File uploaded: ${key} (${file.size} bytes)`);

      // Construct file URL (public endpoint)
      const fileUrl = `${this.configService.get<string>('s3.endpoint')}/${this.bucket}/${key}`;

      return {
        fileId,
        fileName: key,
        fileUrl,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      throw new BadRequestException('File upload failed');
    }
  }

  /**
   * Get presigned URL for temporary file access
   *
   * @param fileName - S3 key/filename
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Presigned URL
   */
  async getPresignedUrl(
    fileName: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      // Verify file exists
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: fileName,
        }),
      );

      // Generate presigned URL
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return url;
    } catch (error) {
      if (error.name === 'NotFound') {
        throw new NotFoundException('File not found');
      }
      this.logger.error(
        `Presigned URL generation failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to generate file URL');
    }
  }

  /**
   * Delete a file from S3
   *
   * @param fileName - S3 key/filename
   * @param userId - User ID (for authorization)
   */
  async deleteFile(fileName: string, userId: string): Promise<void> {
    try {
      // Get file metadata to verify ownership
      const headResult = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: fileName,
        }),
      );

      // Check if user owns the file
      const uploadedBy = headResult.Metadata?.['uploaded-by'];
      if (uploadedBy && uploadedBy !== userId) {
        throw new BadRequestException('You can only delete your own files');
      }

      // Delete file
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: fileName,
        }),
      );

      this.logger.log(`File deleted: ${fileName}`);
    } catch (error) {
      if (error.name === 'NotFound') {
        throw new NotFoundException('File not found');
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`File deletion failed: ${error.message}`, error.stack);
      throw new BadRequestException('File deletion failed');
    }
  }

  /**
   * List files for a user or story
   *
   * @param userId - User ID
   * @param storyId - Optional story ID filter
   * @returns List of files
   */
  async listFiles(
    userId: string,
    storyId?: string,
  ): Promise<
    Array<{
      fileName: string;
      size: number;
      lastModified: Date;
      url: string;
    }>
  > {
    const prefix = storyId
      ? `stories/${storyId}/`
      : `uploads/${userId}/`;

    try {
      const result = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
        }),
      );

      const files = (result.Contents || [])
        .filter((item) => item.Key && item.Size !== undefined && item.LastModified)
        .map((item) => ({
          fileName: item.Key!,
          size: item.Size!,
          lastModified: item.LastModified!,
          url: `${this.configService.get<string>('s3.endpoint')}/${this.bucket}/${item.Key}`,
        }));

      return files;
    } catch (error) {
      this.logger.error(`File listing failed: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to list files');
    }
  }

  /**
   * Validate uploaded file
   *
   * @param file - Uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type '${file.mimetype}' is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  /**
   * Get file extension from filename
   *
   * @param filename - Original filename
   * @returns File extension with dot (e.g., '.jpg')
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot) : '';
  }
}
