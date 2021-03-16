#!/bin/sh

set -e

CMD="$@"

# Set default values
POSTGRES_PORT=${POSTGRES_PORT:-5432}
NODE_ENV=${NODE_ENV:-"production"}

# Helper method to extract host and port from url
parse_url() {
  # Extract the protocol
  proto="$(echo $1 | grep :// | sed -e's,^\(.*://\).*,\1,g')"
  # Remove the protocol
  url=$(echo $1 | sed -e s,$proto,,g)
  # Extract the host and port
  hostport=$(echo $url | cut -d/ -f1)
  # Extract host without port
  host="$(echo $hostport | sed -e 's,:.*,,g')"
  # Try to extract the port
  port="$(echo $hostport | sed -e 's,^.*:,:,g' -e 's,.*:\([0-9]*\).*,\1,g' -e 's,[^0-9],,g')"
  # Set port default when not given
  if [ -z "$port" ]
  then
    [ "$proto" = "https://" ] && port=443 || port=80
  fi
  echo "$host:$port"
}

# Wait until graph node is ready
./wait-for-it.sh "$(parse_url $GRAPH_NODE_ENDPOINT)" -t 60

# Wait until database is ready
./wait-for-it.sh "$POSTGRES_HOST:$POSTGRES_PORT" -t 60

# Set DATABASE_URL env variable in correct format for application
export DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DATABASE_API

# Run migrations
npm run db:migrate
npm run db:seed

# Finally execute start command
exec $CMD
