#!/bin/sh

set -e

CMD="$@"

# Set default values
POSTGRES_PORT=${POSTGRES_PORT:-5432}
NODE_ENV=${NODE_ENV:-"production"}

# Wait until database is ready
while ! PGPASSWORD=$POSTGRES_PASSWORD pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE_API" > /dev/null 2> /dev/null; do
  echo "Waiting for database to be ready ..."
  sleep 5
done
>&2 echo "Database is ready!"

# Set DATABASE_URL env variable in correct format for application
export DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DATABASE_API

# Run migrations
npm run db:migrate
npm run db:seed

# Finally execute start command
exec $CMD
