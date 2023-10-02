import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import httpStatus from 'http-status';
import mime from 'mime';

import APIError from '../helpers/errors';
import User from '../models/users';
import { FIELD_NAME } from '../routes/uploads';
import { respondWithSuccess, respondWithError } from '../helpers/responses';
import { s3, AWS_S3_DOMAIN } from '../services/aws';

export const KEY_PATH = 'uploads/avatars/';

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
      const key = `${KEY_PATH}${fileName}`;

      const params = {
        Bucket: bucket, // The name of the bucket.
        Key: key, // The name of the object.
        Body: buffer, // The content of the object.
        ACL: 'public-read',
        ContentType: mime.getType(fileType),
      };

      const results = await s3.send(new PutObjectCommand(params));
      respondWithSuccess(
        res,
        {
          url: `https://${bucket}.${AWS_S3_DOMAIN}/${key}`,
          fileName,
          fileType,
        },
        results.$metadata.httpStatusCode,
      );
    } catch (error) {
      next(error);
    }
  },

  deleteAvatarImage: async (req, res, next) => {
    const bucket = process.env.AWS_S3_BUCKET;
    try {
      const { url } = req.body;
      const imageUrl = new URL(url);
      if (
        imageUrl.host != `${bucket}.${AWS_S3_DOMAIN}` ||
        !imageUrl.pathname.startsWith(`/${KEY_PATH}`)
      ) {
        respondWithError(res, {}, httpStatus.BAD_REQUEST);
      } else {
        // Check that the url is not used in the users db
        const avatarExists = await User.findOne({
          where: {
            avatarUrl: url,
          },
        });
        if (avatarExists) {
          respondWithError(res, {}, httpStatus.UNPROCESSABLE_ENTITY);
        } else {
          const pathSplit = imageUrl.pathname.split('/');
          const fileName = pathSplit[pathSplit.length - 1];
          const key = `${KEY_PATH}${fileName}`;
          const params = {
            Bucket: bucket, // The name of the bucket.
            Key: key, // The name of the object.
          };
          const results = await s3.send(new DeleteObjectCommand(params));
          respondWithSuccess(res, {}, results.$metadata.httpStatusCode);
        }
      }
    } catch (error) {
      next(error);
    }
  },
};
