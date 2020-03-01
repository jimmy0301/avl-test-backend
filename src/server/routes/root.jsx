// import serialize from 'serialize-javascript';
import express from 'express';
import { getRestaurant, importRestaurant } from '../api/restaurant';

const router = express.Router();
// const jsonParser = express.json({ limit: '50mb' });

router.get('/restaurant', getRestaurant);
router.post('/restaurant', importRestaurant);

export default router;
