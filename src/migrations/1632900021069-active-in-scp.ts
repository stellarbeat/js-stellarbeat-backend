import { MigrationInterface, QueryRunner } from 'typeorm';

export class activeInScp1632900021069 implements MigrationInterface {
	name = 'activeInScp1632900021069';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "public"."node_measurement_v2" ADD "isActiveInScp" boolean NOT NULL DEFAULT FALSE`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "public"."node_measurement_v2" DROP COLUMN "isActiveInScp"`
		);
	}
}
