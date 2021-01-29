# js-stellarbeat-backend

Use the crawler to search for nodes

Calculate uptime and other statistics

Fetch geo data

Store the nodes in a sql database

Provide REST api


## install

````
> yarn install # install dependencies
> yarn build # build the code into the lib folder
> yarn seed-db # add some starter nodes to bootstrap the crawling process
# Database migrations are run automatically when the code is first run.
> yarn init-rollup # initizalize the statistics aggregation in database
````

## Run the backend (crawl nodes, toml files, geo data,...)

````
yarn update-nodes
````
The NETWORK environment variable controls the crawled network (public or test). The default is public.

## Run the api

````
yarn start-api
````


## Run tests

The test folder contains both unit and integration tests. A test database is required for the integration tests that you can configure with the DATABASE_TEST_URL env variable.

```` yarn test ````