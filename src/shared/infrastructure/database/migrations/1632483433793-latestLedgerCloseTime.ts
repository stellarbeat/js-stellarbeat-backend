import { MigrationInterface, QueryRunner } from 'typeorm';

export class latestLedgerCloseTime1632483433793 implements MigrationInterface {
	name = 'latestLedgerCloseTime1632483433793';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "public"."crawl_v2" ADD "latestLedgerCloseTime" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT '"1970-01-01T00:00:00.000Z"'`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "public"."crawl_v2" DROP COLUMN "latestLedgerCloseTime"`
		);
	}
}
