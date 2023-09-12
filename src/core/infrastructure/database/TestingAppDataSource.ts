import { DataSource } from 'typeorm';
import { BaseDataSourceOptions } from 'typeorm/data-source/BaseDataSourceOptions';

const TestingAppDataSource: DataSource = new DataSource({
	type: 'postgres',
	dropSchema: true,
	synchronize: true,
	logging: false,
	url: process.env.DATABASE_TEST_URL,
	entities: ['src/**/entities/*.ts', 'src/**/domain/**/!(*.test)*.ts'],
	migrationsRun: false,
	ssl: false
});

export { TestingAppDataSource };
