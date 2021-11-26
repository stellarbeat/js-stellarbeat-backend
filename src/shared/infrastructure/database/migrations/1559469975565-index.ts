import { MigrationInterface, QueryRunner } from 'typeorm';

export class index1559469975565 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`CREATE INDEX "IDX_b33f4eb533966ee0673926cb58" ON "node_measurement" ("publicKey") `
		);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`DROP INDEX "IDX_b33f4eb533966ee0673926cb58"`);
	}
}
