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

router.get('/', validate(usersValidation.findUsers), usersController.findUsers);

router.get(
  '/:username',
  validate(usersValidation.getByUsername),
  usersController.getByUsername,
);

export default router;
