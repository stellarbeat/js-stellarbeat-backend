[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
# Stellarbeat backend 
_Warning: Backend is under active development and subject to a changing API. Use at own risk. BC breaks between versions will be documented in changelog file._

The backend consists of three major modules.
1) Network: Collects, updates and exposes network data (nodes, organizatins, stats,...). 
2) Notifications: Allows users to subscribe to network events and receive (email) notifications.
3) History-scan: Scans history archives for errors. 

The core module contains app wide functionality like logging, configuration, database, etc.

## install

````
> yarn install # install dependencies
> yarn build # build the code into the lib folder
> yarn seed-db # add some starter nodes to bootstrap the crawling process
# Database migrations are run automatically when the code is first run.
> yarn init-rollup # initizalize the statistics aggregation in database
````

## Usage
Every package has a README.md file with more detailed information.

## Run the api
````
yarn start-api
````

## Run tests

The test folder contains both unit and integration tests. A test database is required for the integration tests that you can configure with the DATABASE_TEST_URL env variable.

```` 
yarn test 
yarn test:unit
yarn test:integration
````