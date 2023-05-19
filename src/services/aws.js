import aws from 'aws-sdk';

import { S3 } from "@aws-sdk/client-s3";

aws.config.region = process.env.AWS_REGION || 'eu-central-1';

export const s3 = new S3();
