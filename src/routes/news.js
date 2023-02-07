import express from 'express';

import newsController from '../controllers/news';
import newsValidation from '../validations/news';
import validate from '../helpers/validate';

const router = express.Router();

router.get('/', validate(newsValidation.findNews), newsController.findNews);

export default router;