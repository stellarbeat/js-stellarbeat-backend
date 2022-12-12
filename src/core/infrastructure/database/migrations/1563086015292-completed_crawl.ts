import { MigrationInterface, QueryRunner } from 'typeorm';

export class completedCrawl1563086015292 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`ALTER TABLE "crawl" ADD "completed" boolean NOT NULL DEFAULT false`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`ALTER TABLE "crawl" DROP COLUMN "completed"`);
	}
}
