# Releasing `circles-api`

Use this checklist to create a new release of `circles-api` and distribute the Docker image to our private DigitalOcean registry and [DockerHub](https://hub.docker.com/u/joincircles). All steps are intended to be run from the root directory of the repository.

## Creating a new release

1. Make sure you are currently on the `main` branch, otherwise run `git checkout main`.
2. `git pull` to make sure you haven’t missed any last-minute commits. After this point, nothing else is making it into this version.
3. `npm test` to ensure that all tests pass locally.
4. `git push` and verify all tests pass on all CI services.
5. Read the git history since the last release, for example via `git --no-pager log --oneline --no-decorate v1.3.12^..origin/main` (replace `v1.3.12` with the last published version).
6. Condense the list of changes into something user-readable inside of `CHANGELOG.md` with the release date and version, following the specification here on [how to write a changelog](https://keepachangelog.com/en/1.0.0/).
7. Commit the changes you've made to `CHANGELOG.md`.
8. Create a git and npm tag based on [semantic versioning](https://semver.org/) using `npm version [major | minor | patch]`.
9. `git push origin main --tags` to push the tag to GitHub.
10. `git push origin main` to push the automatic `package.json` change after creating the tag.
11. [Create](https://github.com/CirclesUBI/circles-api/releases/new) a new release on GitHub, select the tag you've just pushed under *"Tag version"* and use the same for the *"Release title"*. For *"Describe this release"* copy the same information you've entered in `CHANGELOG.md` for this release. See examples [here](https://github.com/CirclesUBI/circles-api/releases).

## Building and uploading Docker image to registries

All tagged GitHub commits should be uploaded to our private DigitalOcean registry and the public DockerHub registry automatically by the [tagbuild.yaml](https://github.com/CirclesUBI/circles-api/blob/main/.github/workflows/tagbuild.yml) GitHub Action.

After the action was completed successfully you can now use the uploaded Docker image to deploy it.

## Deploy release

### `circles-docker`

For local development we use the `circles-docker` repository to create all Circles services. To upload the version of `circles-api` please update the following configuration [here](https://github.com/CirclesUBI/circles-docker/blob/main/docker-compose.api-pull.yml) and commit the update to the `circles-docker` repository.

Rebuild your environment via `make build` to use the updated version in your local development setup. Consult the `README.md` in the repository to read more about how to run your local setup.

### `circles-iac`

The official `staging` and `production` servers of Circles are maintained via the `circles-iac` repository. Both environments have separated version configurations for all services. You will need to change the version for [staging](https://github.com/CirclesUBI/circles-iac/blob/main/helm/circles-infra-suite/values-staging.yaml) and [production](https://github.com/CirclesUBI/circles-iac/blob/main/helm/circles-infra-suite/values-production.yaml) in the regarding `imageTag` fields. Commit the update to the `circles-iac` repository.

Deploy the release via `helm` to the regarding Kubernetes cluster on DigitalOcean. Consult the `README.md` in the repository to read more about how deploy on Kubernetes.
