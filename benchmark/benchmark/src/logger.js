const log4js =  require("log4js");
const path = require("path");

const config = require("../config.json")
const args = require("minimist")(process.argv.slice(2))

log4js.configure({
	appenders: {
		console: {
			type: "console"
		},
		app: {
			type: "dateFile",
			filename: path.join("logs/", "app"),
			pattern: "yyyy-MM-dd.log",
			alwaysIncludePattern: true,
			encoding: "utf-8",
			maxLogSize: 104857600,
			keepFileExt: true
		}
	},
	categories: {
		default: { appenders: ["app", "console"], level: "DEBUG" },
	},
});

const logger = log4js.getLogger();
logger.level = args["log_level"] ? args["log_level"] : config.log_level;

module.exports = logger
