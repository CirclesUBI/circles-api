import express from 'express';
import httpStatus from 'http-status';

import APIError from '../helpers/errors';
import usersRouter from './users';
import { respondWithSuccess } from '../helpers/responses';

const router = express.Router();

router.get('/', (req, res) => {
  respondWithSuccess(res);
});

router.use('/users', usersRouter);

router.use(() => {
  throw new APIError(httpStatus.NOT_FOUND);
});

export default router;
