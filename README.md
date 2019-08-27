# Circles Username Resolver

<p>
  <a href="https://chat.joincircles.net">
    <img src="https://chat.joincircles.net/api/v1/shield.svg?type=online&name=circles%20chat" alt="Chat Server">
  </a>
  <a href="https://opencollective.com/circles">
    <img src="https://opencollective.com/circles/supporters/badge.svg" alt="Backers">
  </a>
  <a href="https://github.com/CirclesUBI/circles-username-resolver/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-APGLv3-orange.svg" alt="License">
  </a>
  <a href="https://travis-ci.org/CirclesUBI/circles-username-resolver">
    <img src="https://api.travis-ci.com/CirclesUBI/circles-username-resolver.svg?branch=development" alt="Build Status">
  </a>
  <a href="https://twitter.com/CirclesUBI">
    <img src="https://img.shields.io/twitter/follow/circlesubi.svg?label=follow+circles" alt="Follow Circles">
  </a>
</p>

A very simple offchain API service to store and resolve [Circles](https://joincircles.net) user data from public adresses.

## Development

```
// Install dependencies
npm install

// Copy .env file for local development
cp .env.example .env

// Copy .env file for local testing
cp .env.example .env.test

// Seed and migrate database
npm run db:migrate
npm run db:seed

// Run tests
npm run test
npm run test:watch

// Check code formatting
npm run lint

// Start local server and watch changes
npm run serve

// Build for production
npm run build

// Run production server
npm start
```

## License

GNU Affero General Public License v3.0 `AGPL-3.0`
