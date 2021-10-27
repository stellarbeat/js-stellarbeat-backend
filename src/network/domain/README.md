### Domain location
The domain classes for the network module are reused in the frontend. They are located in a separate npm module: https://github.com/stellarbeat/js-stellar-domain/

### Database model location
The data necessary to build up the domain model is stored in the database and defined through typeorm entity models in network/infra/database. TODO: domain network = network update + node snapshots + organization snapshots + measurements on database level. 

### Domain to and from database
In the network repositories (src/network/repository) the domain classes are built from the database entities and vice versa.