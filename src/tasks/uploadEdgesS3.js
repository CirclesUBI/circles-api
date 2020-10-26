import Queue from 'bull';
import fs from 'fs';

import logger from '../helpers/logger';
import processor from './processor';
import { EDGES_FILE_PATH, checkFileExists } from '../services/transfer';
import { redisUrl, redisOptions } from '../services/redis';
import { s3 } from '../services/aws';

const uploadEdgesS3 = new Queue('Upload edges to S3 storage', redisUrl, {
  settings: redisOptions,
});

processor(uploadEdgesS3).process(async () => {
  if (!checkFileExists()) {
    logger.log(`${EDGES_FILE_PATH} does not exist yet. Skip job`);
    return;
  }

  const edges = fs.readFileSync(EDGES_FILE_PATH);

  return await s3
    .putObject({
      Bucket: process.env.AWS_S3_BUCKET_TRUST_NETWORKS,
      Key: `${new Date().toJSON().slice(0, 10)}.json`,
      Body: edges,
      ACL: 'public-read',
      ContentType: 'application/json',
    })
    .promise();
});

export default uploadEdgesS3;
