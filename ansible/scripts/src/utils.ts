import * as dotenv from "dotenv";
dotenv.config();

import fetch from "node-fetch";
import { createHttpLink } from "apollo-link-http";
import { InMemoryCache } from "apollo-cache-inmemory";
import ApolloClient from "apollo-client";
import { readFileSync } from "fs";
import { Muta } from "muta-sdk";
const toml = require("toml");
const yaml = require("js-yaml");

export const CHAIN_ID =
  "0xb6a4d7da21443f5e816e8700eea87610e6d769657d6b8ec73028457bf2ca4036";
export const API_URL = process.env.API_URL || "http://localhost:8000/graphql";
export const client = new ApolloClient({
  link: createHttpLink({
    uri: API_URL,
    fetch: fetch
  }),
  cache: new InMemoryCache(),
  defaultOptions: { query: { fetchPolicy: "no-cache" } }
});
export const muta = new Muta({
  endpoint: API_URL,
  chainId: CHAIN_ID
});

export function makeid(length: number) {
  var result = "";
  var characters = "abcdef0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function getNonce() {
  return makeid(64);
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// export const CHAIN_CONFIG = toml.parse(readFileSync("./config.toml", "utf-8"));

export const DOCKER_COMPOSE_CONFIG = yaml.safeLoad(
  readFileSync("/chain/docker-compose.yaml", "utf-8")
);

export const CHAIN_META = require("/chain/current_chain_meta.json");

export const URLS = Object.entries(DOCKER_COMPOSE_CONFIG.services)
  .filter(entry => entry[0] !== "scripts")
  .map(entry => {
    const value = entry[1] as Object;
    return value["networks"]["chaos"]["ipv4_address"];
  })
  .map(ip => `http://${ip}:8000/graphql`);

const winston = require("winston");

export const logger = winston.createLogger({
  // level: 'info',
  // format: winston.format.json(),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "/chain/logs/monitor.log" }),
    new winston.transports.Console()
  ]
});

import * as request from "request-promise-native";
export const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
export const CHAT_ID = parseInt(process.env.CHAT_ID || "0");
export const sendMessageToTelegram = async (text: string) => {
  await request.post({
    url: `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
    form: {
      chat_id: CHAT_ID,
      text
    }
  });
};
export const log = async (
  name: string,
  msg: object | string,
  level: string = "info",
  notify: boolean = false
) => {
  let log, out;
  if (typeof msg === "string") {
    out = `[${name}] ${msg}`;
    log = { name, msg };
  } else {
    out = `[${name}]: ${JSON.stringify(msg)}`;
    log = { name, ...msg };
  }
  logger.log({ level, message: log });
  if (notify) {
    sendMessageToTelegram(out);
  }
};
