import express from 'express';

import uploadsController from '../controllers/uploads';
import uploadFilesMiddleware from '../middlewares/uploads';
import convertImagesMiddleware from '../middlewares/images';

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

export default router;
