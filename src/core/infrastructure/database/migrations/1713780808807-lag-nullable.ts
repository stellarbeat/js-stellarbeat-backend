import { MigrationInterface, QueryRunner } from 'typeorm';

export class LagNullable1713780808807 implements MigrationInterface {
	name = 'LagNullable1713780808807';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" ALTER COLUMN "lag" DROP NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" ALTER COLUMN "lag" DROP DEFAULT`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" ALTER COLUMN "lag" SET DEFAULT '0'`
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" ALTER COLUMN "lag" SET NOT NULL`
		);
	}
}
