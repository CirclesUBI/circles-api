import express from 'express';

import uploadsController from '../controllers/uploads';
import uploadFilesMiddleware from '../middlewares/uploads';
import convertImagesMiddleware from '../middlewares/images';

const router = express.Router();

router.post(
  '/avatar',
  uploadFilesMiddleware([
    {
      name: 'avatar',
      maxCount: 1,
    },
  ]),
  convertImagesMiddleware([
    {
      name: 'avatar',
      versions: [
        {
          width: 800,
          height: 800,
        },
      ],
    },
  ]),
  uploadsController.uploadAvatarImage,
);

export default router;
