FROM node:16-alpine
WORKDIR /usr/src/app

RUN apk add pkgconfig cairo-dev pango-dev libjpeg giflib-dev librsvg-dev pixman-dev g++ make py3-pip

COPY package.json yarn.lock tsconfig.json ./
COPY ./src ./src

RUN yarn install
RUN yarn build

RUN yarn install --production
RUN apk del g++ make py3-pip

EXPOSE 8080
CMD ["yarn", "start"]
