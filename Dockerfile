FROM node:12-slim

WORKDIR /usr/src/app

# Create man folders which are required by postgres
RUN seq 1 8 | xargs -I{} mkdir -p /usr/share/man/man{}

# Install dependencies
RUN apt-get update \
      && apt-get install -y git python build-essential postgresql-client

# Copy project
COPY . .

# Install npm dependencies and build project
RUN npm install \
      && npm run build

# Remove unneeded dependencies
RUN apt-get purge -y --auto-remove build-essential

# Copy runtime scripts into root
COPY scripts/run.sh .
COPY scripts/run-worker.sh .
COPY scripts/wait-for-db.sh .

EXPOSE 3000

ENTRYPOINT ["./wait-for-db.sh"]
