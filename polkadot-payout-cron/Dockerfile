FROM node:16-alpine

RUN mkdir /home/node/app/ && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY --chown=node:node package*.json yarn.lock ./

USER node

RUN npm install && npm cache clean --force --loglevel=error

COPY --chown=node:node index.js .

CMD [ "node", "--unhandled-rejections=strict", "index.js" ]
