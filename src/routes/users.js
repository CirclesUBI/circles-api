import express from 'express';

import usersController from '../controllers/users';
import usersValidation from '../validations/users';
import validate from '../helpers/validate';

const router = express.Router();

router.post(
  '/',
  validate(usersValidation.dryRunCreateNewUser),
  usersController.dryRunCreateNewUser,
);

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

router.post(
  '/:safeAddress',
  validate(usersValidation.updateUser),
  usersController.updateUser,
);

router.get(
  '/:safeAddress/email',
  validate(usersValidation.getEmail),
  usersController.getEmail,
);

export default router;
