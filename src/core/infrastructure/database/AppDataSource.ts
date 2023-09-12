import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

const AppDataSource = new DataSource({
	type: 'postgres',
	logging: false,
	synchronize: false,
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
});

export { AppDataSource };
