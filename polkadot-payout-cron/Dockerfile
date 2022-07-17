FROM node:16-alpine

RUN mkdir /home/node/app/ && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY --chown=node:node package*.json yarn.lock tsconfig.json  ./

COPY --chown=node:node src/ ./src

USER node

RUN npm install && npm run build && npm cache clean --force --loglevel=error

CMD [ "node", "--unhandled-rejections=strict", "build/index.js" ]
