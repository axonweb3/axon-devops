FROM node:16-slim

WORKDIR /server

ADD ./ .

RUN yarn install


CMD [ "node", "/server/index.js" ]