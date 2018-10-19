var config = require('config');
var dbConfig = config.get('dbConfig');

module.exports = {
    development: {
        client: 'mysql',
        connection: {
            host : dbConfig.host,
            user : dbConfig.user,
            password : dbConfig.password,
            database: dbConfig.database
        },
        pool: {
            min: 0,
            max: 5
        }
    },
    staging: {
        client: 'mysql',
        connection: {
            host : process.env.DB_HOST_STAGING,
            user : process.env.DB_USER_STAGING,
            password : process.env.DB_PASSWORD_STAGING,
            database: process.env.DB_NAME_STAGING
        },
        pool: {
            min: 0,
            max: 5
        }
    },
    production: {
        client: 'mysql',
        connection: {
            host : process.env.DB_HOST_PROD,
            user : process.env.DB_USER_PROD,
            password : process.env.DB_PASSWORD_PROD,
            database: process.env.DB_NAME_PROD
        },
        pool: {
            min: 0,
            max: 5
        }
    }
};