import httpStatus from 'http-status';
import mime from 'mime';

import { FIELD_NAME } from '../routes/uploads';
import { respondWithSuccess } from '../helpers/responses';
import { s3 } from '../services/aws';

async function uploadAvatarImage(req, res, next) {
  const bucket = process.env.AWS_S3_BUCKET;

  try {
    if (!req.locals || !req.locals[FIELD_NAME]) {
      throw new Error('No files given');
    }

    const { buffer, fileName, fileType } = req.locals.images[FIELD_NAME][0];
    const key = `uploads/avatars/${fileName}`;

    await s3
      .putObject({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ACL: 'public-read',
        ContentType: mime.getType(fileType),
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
