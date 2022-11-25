<div align="center">
	<img width="80" src="https://raw.githubusercontent.com/CirclesUBI/.github/main/assets/logo.svg" />
</div>

<h1 align="center">circles-api</h1>

<div align="center">
 <strong>
   Offchain API service for Circles
 </strong>
</div>

<br />

<div align="center">
  <!-- Licence -->
  <a href="https://github.com/CirclesUBI/circles-api/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/CirclesUBI/circles-api?style=flat-square&color=%23cc1e66" alt="License" height="18">
  </a>
  <!-- CI status -->
  <a href="https://github.com/CirclesUBI/circles-api/actions/workflows/run-tests.yml">
    <img src="https://img.shields.io/github/workflow/status/CirclesUBI/circles-api/run-tests?label=tests&style=flat-square&color=%2347cccb" alt="CI Status" height="18">
  </a>
  <!-- Discourse -->
  <a href="https://aboutcircles.com/">
    <img src="https://img.shields.io/discourse/topics?server=https%3A%2F%2Faboutcircles.com%2F&style=flat-square&color=%23faad26" alt="chat" height="18"/>
  </a>
  <!-- Twitter -->
  <a href="https://twitter.com/CirclesUBI">
    <img src="https://img.shields.io/twitter/follow/circlesubi.svg?label=twitter&style=flat-square&color=%23f14d48" alt="Follow Circles" height="18">
  </a>
</div>

<div align="center">
  <h3>
    <a href="API.md">
      API Docs
    </a>
    <span> | </span>
    <a href="https://handbook.joincircles.net">
      Handbook
    </a>
    <span> | </span>
    <a href="https://github.com/CirclesUBI/circles-api/releases">
      Releases
    </a>
    <span> | </span>
    <a href="https://github.com/CirclesUBI/.github/blob/main/CONTRIBUTING.md">
      Contributing
    </a>
  </h3>
</div>

<br/>

An offchain API service to safely store and resolve [`Circles`] user data from public adresses and find transitive transfer paths to send tokens within the trust graph.

[`circles`]: https://joincircles.net

## Features

- Create and search off-chain data like transfer descriptions and user profiles
- Indexes and stores Circles trust network
- Calculate transitive transfer steps to send Circles

## Requirements

- NodeJS environment (tested with v14)
- PostgreSQL database
- Redis

## Usage

Check out the [`Dockerfile`] for running the `circles-api` on your server.

[`Dockerfile`]: Dockerfile

## Development

```bash
# Install dependencies
npm install

# Copy .env file for local development
cp .env.example .env

# Seed and migrate database
npm run db:migrate
npm run db:seed

# Run tests
npm run test
npm run test:watch

# Check code formatting
npm run lint

# Start local server and watch changes
npm run watch:all

# Build for production
npm run build

# Run production server
npm start
npm worker:start
```

## Pathfinder

`pathfinder` is a C++ program by [chriseth](https://github.com/chriseth/pathfinder) compiled for Linux arm64 in this repository. To update the pathfinder in the api, build a native binary according to the README instructions from `chriseth` and move the target into your project.

The version we are using corresponds with this commit: https://github.com/chriseth/pathfinder/commit/41f5eda7941e35dc67ebdb04a842eb7d65c810ef

## License

GNU Affero General Public License v3.0 [`AGPL-3.0`]

[`AGPL-3.0`]: LICENSE
