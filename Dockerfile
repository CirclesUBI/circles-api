FROM node:12-alpine AS BUILD_IMAGE

# Create man folders which are required by postgres
RUN seq 1 8 | xargs -I{} mkdir -p /usr/share/man/man{}

# Install dependencies
RUN apk update \
          && apk add git python make g++ postgresql-client \
          && rm -rf /var/cache/apk/*

# Use changes to package.json to force Docker not to use the cache when we
# change our application's NodeJS dependencies:
COPY package.json /tmp/package.json
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
COPY --from=BUILD_IMAGE /usr/src/app/build ./build
COPY --from=BUILD_IMAGE /usr/src/app/node_modules ./node_modules

# Copy runtime scripts into root
COPY --from=BUILD_IMAGE /usr/src/app/scripts/run.sh .
COPY --from=BUILD_IMAGE /usr/src/app/scripts/run-worker.sh .
COPY --from=BUILD_IMAGE /usr/src/app/scripts/wait-for-db.sh .

EXPOSE 3000

ENTRYPOINT ["./wait-for-db.sh"]
