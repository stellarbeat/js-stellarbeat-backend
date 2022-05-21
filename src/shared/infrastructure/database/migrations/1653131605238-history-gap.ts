import { MigrationInterface, QueryRunner } from 'typeorm';

export class historyGap1653131605238 implements MigrationInterface {
	name = 'historyGap1653131605238';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "node_measurement_day_v2" ADD "historyArchiveGapCount" smallint NOT NULL DEFAULT '0'`
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" ADD "historyArchiveGap" boolean NOT NULL DEFAULT false`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" DROP COLUMN "historyArchiveGap"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_day_v2" DROP COLUMN "historyArchiveGapCount"`
		);
	}
}
