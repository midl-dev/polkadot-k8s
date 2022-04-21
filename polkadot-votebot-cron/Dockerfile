FROM node:16-alpine

WORKDIR /app

COPY . /app

RUN ls 
RUN npm install
RUN npm run build
RUN npm cache clean --force --loglevel=error

CMD [ "node", "--unhandled-rejections=strict", "index.js" ]
