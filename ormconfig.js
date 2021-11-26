module.exports = [
	{
		type: 'postgres',
		synchronize: false,
		logging: false, //process.env.NODE_ENV === 'development',
		url: process.env.ACTIVE_DATABASE_URL,
		entities: ['lib/**/entities/*.js', 'lib/**/domain/**/!(*.test)*.js'],
		migrations: ['lib/**/migrations/*.js'],
		migrationsRun: true,
		ssl: true,
		extra: {
			ssl: {
				rejectUnauthorized: false
			}
		}
	},
	{
		name: 'test',
		type: 'postgres',
		dropSchema: true,
		synchronize: true,
		logging: false,
		url: process.env.DATABASE_TEST_URL,
		entities: ['src/**/entities/*.ts', 'src/**/domain/**/!(*.test)*.ts'],
		migrations: ['src/**/migrations/*.ts'],
		migrationsRun: false,
		ssl: true,
		extra: {
			ssl: {
				rejectUnauthorized: false
			}
		}
	}
];
