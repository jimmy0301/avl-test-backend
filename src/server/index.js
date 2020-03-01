import config from 'config';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import express from 'express';
import Mysql from './utils/mysql';
import inject from './middlewares/injectServiceMiddleware';

// Route definitions
import routerRoot from './routes/root';

const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASS,
  MYSQL_DATABASE,
  MYSQL_CONNECTLIMIT,
} = process.env;

const app = express();
const swaggerDocument = YAML.load('swagger.yaml');

const mySqlconfig = {
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASS,
  database: MYSQL_DATABASE,
  connectionLimit: MYSQL_CONNECTLIMIT,
};
const mysql = new Mysql(mySqlconfig);

// Setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(inject('mysql', mysql));

// Static assets
app.use(express.static(config.server.static));

// Routes
app.use('/', routerRoot);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default app;
