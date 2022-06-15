import express from 'express';

import aboutController from '../controllers/about';

const router = express.Router();

router.get('/', aboutController.aboutGET);
router.get('/graphendpoint', aboutController.getGraphEndpoint);

export default router;
