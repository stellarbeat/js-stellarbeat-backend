module.exports = [{
    "type": "postgres",
    "synchronize": false,
    "logging": process.env.NODE_ENV === 'development',
    "url": process.env.ACTIVE_DATABASE_URL,
    "entities": ['lib/entities/*.js'],
    "migrations": ['lib/migrations/*.js'],
    "migrationsDir": 'src/migrations',
    "migrationsRun": true,
    "extra": {"ssl":true}
},
{
        "name": "test",
        "type": "postgres",
        "dropSchema": true,
        "synchronize": true,
        "logging": false,
        "url": process.env.DATABASE_TEST_URL,
        "entities": ['lib/entities/*.js'],
        "migrations": ['lib/migrations/*.js'],
        "migrationsDir": 'src/migrations',
        "migrationsRun": false,
        "extra": {"ssl":true}
}];