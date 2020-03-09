const env = process.env.NODE_ENV ? process.env.NODE_ENV : "dev";

const config = require(`../env/${env}`);

console.log("bot config:", config);

export default config;
