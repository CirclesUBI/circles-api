import { S3 } from '@aws-sdk/client-s3';

const REGION = process.env.AWS_REGION || 'fra1';

const s3 = new S3({
  forcePathStyle: false, // Configures to use subdomain/virtual calling format.
  region: REGION,
  endpoint: 'https://fra1.digitaloceanspaces.com',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const AWS_S3_DOMAIN = 'fra1.cdn.digitaloceanspaces.com';

export { s3 };
