import express from 'express';

import uploadsController from '../controllers/uploads';
import uploadFilesMiddleware from '../middlewares/uploads';
import convertImagesMiddleware from '../middlewares/images';
import uploadsValidation from '../validations/uploads';
import validate from '../helpers/validate';

export const FIELD_NAME = 'files';

const router = express.Router();

router.post(
  '/avatar',
  uploadFilesMiddleware([
    {
      name: FIELD_NAME,
      maxCount: 1,
    },
  ]),
  convertImagesMiddleware([
    {
      name: FIELD_NAME,
      versions: [
        {
          width: 300,
          height: 300,
          suffix: null,
        },
      ],
    },
  ]),
  uploadsController.uploadAvatarImage,
);

router.delete(
  '/avatar',
  validate(uploadsValidation.deleteAvatarImage),
  uploadsController.deleteAvatarImage,
);

export default router;
