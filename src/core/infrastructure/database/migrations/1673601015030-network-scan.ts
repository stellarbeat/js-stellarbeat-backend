import { MigrationInterface, QueryRunner } from 'typeorm';

export class networkScan1673601015030 implements MigrationInterface {
	name = 'networkScan1673601015030';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "network_update" RENAME TO "network_scan"`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
