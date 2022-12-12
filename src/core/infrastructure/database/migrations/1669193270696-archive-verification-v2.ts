import { MigrationInterface, QueryRunner } from 'typeorm';

export class archiveVerification1669193270696 implements MigrationInterface {
	name = 'archiveVerification1669193270696';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ADD "concurrency" smallint NOT NULL default 50`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" DROP COLUMN "concurrency"`
		);
	}
}
