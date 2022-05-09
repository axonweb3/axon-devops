FROM node:16-slim

WORKDIR /benchmark

ADD ./ .

RUN yarn install


CMD [ "node", "/benchmark/index.js" ]
