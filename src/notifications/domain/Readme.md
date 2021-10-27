## Domain classes
Contains the domain logic. No dependencies on external systems, db storage,... Can run entirely in memory. Because of the benefits of an orm the entities do contain ORM/database annotations.
### typeorm issues
* when hydrating the constructor arguments are undefined. Therefore, we use the create static method when creating in the domain/app. This could be fixed in a next version.
* Many-to-one relationships require the many-to-one prop. For example contact in EventSubscription. It is not needed when we use the one-to-many side, but we have to define it and make it public. We mark it as deprecated to indicate it should not be used. 

We could solve this by adding an extra mapping layer (separate typeorm entities and domain entities and map between them). But to not lose dev speed we use the above workarounds. Maybe another orm would be a better fit in the future.