import { S3 } from '@aws-sdk/client-s3';

const REGION = process.env.AWS_REGION || 'eu-central-1';

const s3 = new S3({ region: REGION });

export const AWS_S3_DOMAIN = 's3.amazonaws.com';

export { s3 };
