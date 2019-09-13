import express from 'express';

import usersController from '../controllers/users';
import usersValidation from '../validations/users';
import validate from '../helpers/validate';

const router = express.Router();

router.put(
  '/',
  validate(usersValidation.createNewUser),
  usersController.createNewUser,
);

export default router;
