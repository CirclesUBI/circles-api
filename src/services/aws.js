import aws from 'aws-sdk';

aws.config.region = process.env.AWS_REGION || 'eu-central-1';

export const s3 = new aws.S3();
