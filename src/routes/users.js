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

router.post(
  '/:safeAddress/email',
  validate(usersValidation.getPrivateUserData),
  usersController.getEmail,
);

router.post(
  '/:safeAddress/get-profile-migration-consent',
  validate(usersValidation.getPrivateUserData),
  usersController.getProfileMigrationConsent,
);

router.post(
  '/:safeAddress/update-profile-migration-consent',
  validate(usersValidation.updateProfileMigrationConsent),
  usersController.updateProfileMigrationConsent,
);

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

router.delete(
  '/:safeAddress',
  validate(usersValidation.deleteUser),
  usersController.deleteUser,
);

export default router;
