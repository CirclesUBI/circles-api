import express from 'express';

import transfersController from '../controllers/transfers';
import transfersValidation from '../validations/transfers';
import validate from '../helpers/validate';

const router = express.Router();

router.post(
  '/',
  validate(transfersValidation.findTransferSteps),
  transfersController.findTransferSteps,
);

export default router;
