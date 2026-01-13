import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AppConfigService } from '../env';
import aws from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private s3Client: aws.S3;
  private bucketName: string;

  constructor(
    private readonly config: AppConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(S3Service.name);

    this.bucketName = this.config.awsS3Bucket;

    this.s3Client = new aws.S3({
      endpoint: this.config.awsEndpoint,
      region: this.config.awsRegion,
      credentials: {
        accessKeyId: this.config.awsAccessKeyId,
        secretAccessKey: this.config.awsSecretAccessKey,
      },
    });
  }

  /**
   * Upload file to S3
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'profiles',
  ): Promise<string | undefined> {
    const key = `${folder}/${Date.now()}-${file.originalname}`;

    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentEncoding: "base64",
          ACL: "public-read",
        },
      });

      const result = await upload.done();
      return result?.Location;
    } catch (error) {
      this.logger.error({ err: error, key }, 'Failed to upload file to S3');
      throw error;
    }
  }
}
