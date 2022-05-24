#!/bin/sh

set -e

CMD="$@"

# Set default values
POSTGRES_PORT=${POSTGRES_PORT:-5432}
NODE_ENV=${NODE_ENV:-"production"}
SYM="@"
# Wait until database is ready
./wait-for-it.sh "$POSTGRES_HOST:$POSTGRES_PORT" -t 60

# Set DATABASE_URL env variable in correct format for application
export DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD$SYM$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DATABASE_API

# Run migrations
npm run db:migrate
npm run db:seed

# Finally execute start command
exec $CMD
