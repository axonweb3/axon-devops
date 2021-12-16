import { CHAIN_META, logger_format } from './utils';
const winston = require("winston");

const deploy_logger = winston.createLogger({
  format: logger_format,
  transports: [
    new winston.transports.File({ filename: "/devops/chain-data/deploy.log" }),
    // new winston.transports.Console(),
  ]
});
deploy_logger.log({level: 'info', name: 'deploy_finish', message: {chain_meta: CHAIN_META}});