import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import chalk from 'chalk';
import { createLogger, format, transports } from 'winston';

const dirPath = path.resolve(__dirname, 'logs');

const { LOG_LEVEL, TIME_ZONE } = process.env;

const formatConsole = format.combine(
  format.colorize(),
  format.timestamp(),
  format.printf(info => {
    const { timestamp, label, level, message } = info;
    const time = moment
      .tz(timestamp, 'YYYY-MM-DD HH:mm:ss.SSS+00:00', TIME_ZONE)
      .format('YYYY-MM-DD HH:mm:ss.SSS');
    let log = '';
    log += `[${chalk.gray(time)}] `;
    log += label ? `[${chalk.blue(label)}] ` : '';
    log += `[${level}] `;
    log += message;
    return log;
  })
);
const formatFile = format.combine(format.timestamp(), format.json());

if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath);
}

export default createLogger({
  level: LOG_LEVEL,
  transports: [
    new transports.Console({
      format: formatConsole,
      handleExceptions: true,
    }),
    new transports.File({
      filename: path.join(dirPath, 'server.log'),
      format: formatFile,
    }),
  ],
});
