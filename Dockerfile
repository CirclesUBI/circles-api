FROM node:12-alpine AS BUILD_IMAGE

# Install dependencies
RUN apk update
RUN apk add --no-cache git python make g++

# Use changes to package.json to force Docker not to use the cache when we
# change our application's NodeJS dependencies:
COPY package*.json /tmp/
RUN cd /tmp && npm install
RUN mkdir -p /usr/src/app && cp -a /tmp/node_modules /usr/src/app

# From here we load our application's code in, therefore the previous docker
# "layer" thats been cached will be used if possible
WORKDIR /usr/src/app
COPY . .

# Build project
RUN npm run build

# Delete development dependencies required to build app
RUN npm prune --production

FROM node:12-alpine

WORKDIR /usr/src/app

# Copy from build image
COPY --from=BUILD_IMAGE /usr/src/app ./

# Copy runtime scripts into root
COPY --from=BUILD_IMAGE /usr/src/app/scripts/*.sh ./

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
