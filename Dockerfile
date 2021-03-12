FROM node:12-slim

# Create man folders which are required by postgres
RUN seq 1 8 | xargs -I{} mkdir -p /usr/share/man/man{}

# Install dependencies
RUN apt-get update \
      && apt-get install -y git python build-essential postgresql-client

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

# Remove unneeded dependencies
RUN apt-get purge -y --auto-remove build-essential

# Copy runtime scripts into root
COPY scripts/run.sh .
COPY scripts/run-worker.sh .
COPY scripts/wait-for-db.sh .

EXPOSE 3000

ENTRYPOINT ["./wait-for-db.sh"]
