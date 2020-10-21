#!/bin/sh

export NODE_ENV=production

npm run db:migrate
npm run db:seed

node ./build/index.js
