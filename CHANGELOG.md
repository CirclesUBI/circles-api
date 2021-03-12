# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.2] - 2021-03-12

### Added

- Docker builds are now built and uploaded to our new DockerHub page: https://hub.docker.com/r/joincircles/circles-api

### Changed

- Update dependencies [70c0b12](https://github.com/CirclesUBI/circles-api/commit/70c0b120536006610d76a293bad851563ff375cb)
- Improve docker build time [b4f17c0](https://github.com/CirclesUBI/circles-api/commit/b4f17c0e78075475c81eb4f3f9bcaf8f6d845b7b)

## [1.3.1] - 2021-03-12

### Changed

- Worker: Changed paths of `edges.json` file and `pathfinder` executable. [#58](https://github.com/CirclesUBI/circles-api/pull/58)

## [1.3.0] - 2021-03-11

### Added

- Worker: Introduce new indexing task using `bull` scheduler. [#24](https://github.com/CirclesUBI/circles-api/pull/24)
