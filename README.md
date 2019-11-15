# Circles Username Resolver

<p>
  <a href="https://opencollective.com/circles">
    <img src="https://opencollective.com/circles/supporters/badge.svg" alt="Backers">
  </a>
  <a href="https://github.com/CirclesUBI/circles-username-resolver/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-APGLv3-orange.svg" alt="License">
  </a>
  <a href="https://travis-ci.org/CirclesUBI/circles-username-resolver">
    <img src="https://api.travis-ci.com/CirclesUBI/circles-username-resolver.svg?branch=master" alt="Build Status">
  </a>
  <a href="https://twitter.com/CirclesUBI">
    <img src="https://img.shields.io/twitter/follow/circlesubi.svg?label=follow+circles" alt="Follow Circles">
  </a>
</p>

A very simple offchain API service to safely store and resolve [Circles](https://joincircles.net) user data from public adresses.

## Requirements

* NodeJS environment
* PostgreSQL database

## API

### Get entry by username

Get the users entry including its `safeAddress`.

**Request:**

`GET /api/users/<username>`

**Response:**

```
{
  status: 'ok',
  data: {
    id: <int>,
    safeAddress: <string>,
    username: <string>
  }
}
```

**Errors:**

* `404` Not found

### Get multiple entries by username / address

Resolve multiple usernames (via `username[]`) and/or Safe addresses (via `address[]`) in a batch.

**Request:**

`GET /api/users?address[]=<string>&username[]=<string>&...`

**Response:**

```
{
  status: 'ok',
  data: [
    {
      id: <int>,
      safeAddress: <string>,
      username: <string>
    },
    {
      [...]
    },
    [...]
  ]
}
```

**Errors:**

Not found entries silently fail and simply do not get returned in the response.

### Create new entry

**Request:**

`PUT /api/users`

Create a new entry in the database, connecting a `username` with a `safeAddress`.

**Parameters:**

```
{
  address: <string>,
  signature: <string>,
  nonce: <int> (optional),
  data: {
    safeAddress: <string>,
    username: <string>
  }
}
```

- `address`: Public address of user wallet
- `signature`: Signed data payload of this request via the users keypair. The data contains: `address + nonce + safeAddress + username` with `nonce` being `0` when not given
- `nonce`: Optional nonce which is required to [predict the Safe address](https://gnosis-safe.readthedocs.io/en/latest/contracts/deployment.html#trustless-deployment-with-create2)
- `data/safeAddress`: Public address of the owned Safe of the user
- `data/username`: Username which should be connected to the `safeAddress`

**Verification steps:**

1. Check if the `signature` can be verified successfully.
2. Check if `nonce` is given, if not, assume the Safe is already deployed.
3. When Safe is deployed: Check if `address` is owner of the given Safe. When safe is not deployed yet: Check if `nonce` and `address` generate the same `safeAddress`.

**Errors:**

* `400` Parameters missing or malformed
* `403` Verification failed
* `409` Entry already exists

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
