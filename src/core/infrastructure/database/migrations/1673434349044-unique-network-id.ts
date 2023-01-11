import { MigrationInterface, QueryRunner } from 'typeorm';

export class uniqueNetworkId1673434349044 implements MigrationInterface {
	name = 'uniqueNetworkId1673434349044';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "network_change" ADD CONSTRAINT "UQ_c24068b8094a20a9a4c8a0f7ff0" UNIQUE ("networkIdValue")`
		);
		await queryRunner.query(
			`ALTER TABLE "network" ADD CONSTRAINT "UQ_a6427dcac5713566cbf8b7b0162" UNIQUE ("networkIdValue")`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "network" DROP CONSTRAINT "UQ_a6427dcac5713566cbf8b7b0162"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_change" DROP CONSTRAINT "UQ_c24068b8094a20a9a4c8a0f7ff0"`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_ad5b60bd93fc753f5a5b12bc6f" ON "network_change" ("type") `
		);
	}
}
