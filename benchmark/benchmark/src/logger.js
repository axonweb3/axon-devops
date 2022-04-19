const log4js =  require('log4js');

log4js.configure({
	appenders: {
		console: {
			type: 'console'
		},
		app: {
			type: 'file',
			filename: 'logs/app.log',
			maxLogSize: 10485760,
			numBackups: 3,
		},
		errorFile: {
			type: 'file',
			filename: 'logs/errors.log',
			maxLogSize: 10485760,
			numBackups: 3,
		},
		errors: {
			type: 'logLevelFilter',
			level: 'ERROR',
			appender: 'errorFile',
		},
	},
	categories: {
		default: { appenders: ['app', 'errors'], level: 'DEBUG' },
	},
});

const logger = log4js.getLogger();
logger.level = 'info';

module.exports = logger
