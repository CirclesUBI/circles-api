import express from 'express';
import httpStatus from 'http-status';

import APIError from '../helpers/errors';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
  });
});

router.use(() => {
  throw new APIError(httpStatus.NOT_FOUND);
});

export default router;
