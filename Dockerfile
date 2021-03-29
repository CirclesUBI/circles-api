FROM node:12-slim

WORKDIR /usr/src/app

# Install dependencies
RUN apt-get update \
      && apt-get install -y git python build-essential

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

# Remove unneeded dependencies
RUN apt-get purge -y --auto-remove build-essential

# Copy runtime scripts into root
COPY scripts/*.sh ./

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
