import { MigrationInterface, QueryRunner } from 'typeorm';

export class versioningTest1672404044492 implements MigrationInterface {
	name = 'versioningTest1672404044492';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER sequence "node_public_key_id_seq" rename to "node_id_seq"`
		);
		await queryRunner.query(
			`ALTER sequence "organization_id_id_seq" rename to "organization_id_seq"`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
