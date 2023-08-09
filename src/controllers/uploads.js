import { PutObjectCommand } from '@aws-sdk/client-s3';
import httpStatus from 'http-status';
import mime from 'mime';

import APIError from '../helpers/errors';
import { FIELD_NAME } from '../routes/uploads';
import { respondWithSuccess } from '../helpers/responses';
import { s3 } from '../services/aws';

export default {
  uploadAvatarImage: async (req, res, next) => {
    const bucket = process.env.AWS_S3_BUCKET;

    try {
      if (
        !req.locals ||
        !req.locals.images ||
        !req.locals.images[FIELD_NAME] ||
        req.locals.images[FIELD_NAME].length === 0
      ) {
        next(new APIError('No files given', httpStatus.BAD_REQUEST));
        return;
      }

      const { buffer, fileName, fileType } = req.locals.images[FIELD_NAME][0];
      const key = `uploads/avatars/${fileName}`;

      const params = {
        Bucket: bucket, // The name of the bucket.
        Key: key, // The name of the object.
        Body: buffer, // The content of the object.
        ACL: 'public-read',
        ContentType: mime.getType(fileType),
      };

      const results = await s3.send(new PutObjectCommand(params));
      respondWithSuccess(
        results,
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
  },
};
