import httpStatus from 'http-status';

import { s3 } from '../services/aws';
import { respondWithSuccess } from '../helpers/responses';

async function uploadAvatarImage(req, res, next) {
  const bucket = process.env.AWS_S3_BUCKET;

  try {
    const { buffer, fileName, fileType } = req.locals.images.avatar[0];
    const key = `uploads/avatars/${fileName}`;

    await s3
      .putObject({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ACL: 'public-read',
      })
      .promise();

    respondWithSuccess(
      res,
      {
        url: `https://${bucket}.s3.amazonaws.com/${key}`,
        fileName,
        fileType,
      },
      httpStatus.CREATED,
    );
  } catch (error) {
    next(error);
  }
}

export default {
  uploadAvatarImage,
};
