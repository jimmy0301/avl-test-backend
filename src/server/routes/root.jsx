// import serialize from 'serialize-javascript';
import express from 'express';
import { getRestaurant } from '../api/restaurant';

const router = express.Router();
// const jsonParser = express.json({ limit: '50mb' });

router.get('/restaurants', getRestaurant);
// router.post('/restaurant', importRestaurant);

export default router;
