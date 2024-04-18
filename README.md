[![Known Vulnerabilities](https://snyk.io/test/github/stellarbeat/js-stellarbeat-backend/badge.svg)](https://snyk.io/test/github/stellarbeat/js-stellarbeat-backend)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# Stellarbeat backend

_Warning: Backend is under active development and subject to a changing API. Use
at own risk. BC breaks between versions will be documented in changelog file._

The backend consists of three major modules.

1. Network-scan: Collects, updates and exposes network data (nodes,
   organizatins, stats,...).
2. Notifications: Allows users to subscribe to network events and receive
   (email) notifications.
3. History-scan: Scans history archives for errors.

The core module contains app wide functionality like logging, configuration,
database, etc.

## install

```
> yarn install # install dependencies
> yarn build # build the code into the lib folder
# Database migrations are run automatically when the code is first run.
```

Copy env.dist to .env and configure the environment variables.

## Usage

Every package has a README.md file with more detailed information.

### Run the api

```
yarn start-api
```

### Run the history-scan

```
yarn verify-archives
```

### Run the network-scan

```
yarn scan-network
```

### Run tests

The test folder contains both unit and integration tests. A test database is
required for the integration tests that you can configure with the
DATABASE_TEST_URL env variable.

```
yarn test
yarn test:unit
yarn test:integration
```

### Create migration

```
yarn build
yarn typeorm migration:generate src/core/infrastructure/database/migrations/{{MIGRATION_DESCRIPTION}} -d lib/core/infrastructure/database/AppDataSource.js
```

