## ORM usage 
To avoid an extra mapping layer (db <=> typeorm entity <=> domain entity) and help in dev productivity the domain entities contain ORM annotations, so we can (transparently) use the typeorm entities in the domain. 
### typeorm issues
* when hydrating from the database with typeorm, the constructor arguments get undefined values (https://typeorm.io/#/entities) _When using an entity constructor its arguments must be optional. Since ORM creates instances of entity classes when loading from the database, therefore it is not aware of your constructor arguments._ 
To mitigate this we use the create static method when creating in the domain/app. The constructor is marked as private to disable its use in the domain model. This could be fixed in a next typeorm version.
* Many-to-one relationships require the many-to-one annotation and class property. For example the contact property in EventSubscription. It is not needed when we use the one-to-many side, but we have to define it and make it public (https://typeorm.io/#/many-to-one-one-to-many-relations). We mark it as deprecated to indicate it should not be used. 
