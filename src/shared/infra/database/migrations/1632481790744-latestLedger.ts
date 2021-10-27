import { MigrationInterface, QueryRunner } from 'typeorm';

export class latestLedger1632481790744 implements MigrationInterface {
	name = 'latestLedger1632481790744';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "public"."crawl_v2" ADD "latestLedger" bigint NOT NULL DEFAULT '0'`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "public"."crawl_v2" DROP COLUMN "latestLedger"`
		);
	}
}
