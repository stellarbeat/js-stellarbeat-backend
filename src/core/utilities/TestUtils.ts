import { DataSource } from 'typeorm';

export class TestUtils {
	private static async getEntities(dataSource: DataSource) {
		const entities: { name: string; tableName: string }[] = [];
		dataSource.entityMetadatas.forEach((x) =>
			entities.push({ name: x.name, tableName: x.tableName })
		);
		return entities;
	}

	//could be faster if tests supplied a list of entities that should be cleaned.
	static async resetDB(dataSource: DataSource) {
		if (process.env.NODE_ENV !== 'test') {
			throw new Error('Trying to reset DB outside of test environment');
		}
		try {
			const entities = await TestUtils.getEntities(dataSource);
			for (const entity of entities) {
				const repository = await dataSource.getRepository(entity.name);
				await repository.query(`TRUNCATE TABLE ${entity.tableName} CASCADE;`);
			}
		} catch (error) {
			throw new Error(`ERROR: Reset test db: ${error}`);
		}
	}
}
