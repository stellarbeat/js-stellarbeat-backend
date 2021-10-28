import { MigrationInterface, QueryRunner } from 'typeorm';

export class crawlIndexes1560152941696 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`CREATE INDEX "IDX_f54faccf9c7f79fcb537b22dd2" ON "node" ("crawlId") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_7b1195f9c1578dd93507b299a8" ON "organization" ("crawlId") `
		);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`DROP INDEX "IDX_7b1195f9c1578dd93507b299a8"`);
		await queryRunner.query(`DROP INDEX "IDX_f54faccf9c7f79fcb537b22dd2"`);
	}
}
