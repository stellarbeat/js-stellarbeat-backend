[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
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

## crawler and snapshotter/backend decoupling and storage for nodes 

Every node is represented by one or more snapshots in the database. A snapshot has a start and end time to designate when it was 'active'. A node can only have one active snapshot at a time.

The snapshot contains the data that could change over time like name, ip, version,... Only when the data has changed, a new snapshot is created with the new data. 

A node also has measurements, e.g. validating, active,... Every backend run these measurements are saved.

Every backend run, the crawler provides nodes to the snapshotter. The snapshotter has a database of the nodes it knows, and checks if the provided nodes have changed (geodata, name,...).
* If a node has changed: create a new snapshot for that node, and update the endtime for the previous active snapshot. 
* If the node is new to the snapshotter: create a fresh snapshot for that node.
* A node could also be missing, maybe due to a software bug in the crawler. The snapshotter doesn't register a change. However, it does record a measurement for this node. e.g. active = false, validating = false, ...

A separate archiver process is run to deactivate snapshots of nodes that are inactive for over 7 days. A deactivated snapshot is no longer fed to the crawler on the next run. No more measurements for that node will be stored. this archival could be improved by looking at the lifetime of nodes. We don't need to store 7 days of measurements for a node that was only active for an hour in its lifetime, or was just used in a test(script) for example. 