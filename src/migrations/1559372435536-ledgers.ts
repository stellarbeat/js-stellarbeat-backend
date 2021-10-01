import { MigrationInterface, QueryRunner } from 'typeorm';

export class ledgers1559372956880 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`ALTER TABLE "crawl" ADD "ledgers" text NOT NULL DEFAULT ''`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`ALTER TABLE "crawl" DROP COLUMN "ledgers"`);
	}
}
