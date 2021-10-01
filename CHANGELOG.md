# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.13] - 2021-10-01

### Added

- Run a task to sync the full graph every week [#88](https://github.com/CirclesUBI/circles-api/pull/88)
- Create RELEASE.md

## [1.3.12] - 2021-06-22

### Changed

- Improve search for usernames [#86](https://github.com/CirclesUBI/circles-api/pull/86)
- Introduce case insensitivity for usernames [#85](https://github.com/CirclesUBI/circles-api/pull/85)

## [1.3.11] - 2021-05-03

### Fixed

- Negative buffer fix [#76](https://github.com/CirclesUBI/circles-api/pull/76)

## [1.3.8] - 2021-04-28

### Fixed

- Add negative buffer to trust edges [#74](https://github.com/CirclesUBI/circles-api/pull/74)

## [1.3.7] - 2021-04-21

### Fixed

- Docker: Do not wait for graph in entrypoint but in program [#71](https://github.com/CirclesUBI/circles-api/pull/71)

## [1.3.6] - 2021-04-21

### Changed

- Increase transfer step process timeout [cda7a01](https://github.com/CirclesUBI/circles-api/commit/cda7a0101271cf9f8f351fdf69e66dc2f552f96c)

## [1.3.5] - 2021-04-21

### Changed

- Docker: Use bash version of wait-for-it script [745cf5b](https://github.com/CirclesUBI/circles-api/commit/745cf5ba2e404f2a2d5b2b5432ddc09b9cbc1e80)

## [1.3.4] - 2021-03-29

### Fixed

- Docker: Remove multi-step build as it breaks `sharp` [99db714](https://github.com/CirclesUBI/circles-api/commit/99db7148924c2e536ba429b9815a9196d72078af)

## [1.3.3] - 2021-03-29

### Fixed

- Docker: Start worker process when graph node is available [#63](https://github.com/CirclesUBI/circles-api/pull/63)

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
