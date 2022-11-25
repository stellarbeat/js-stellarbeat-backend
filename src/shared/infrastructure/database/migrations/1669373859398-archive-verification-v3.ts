import { MigrationInterface, QueryRunner } from 'typeorm';

export class archiveVerification1669373859398 implements MigrationInterface {
	name = 'archiveVerification1669373859398';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ADD "toLedger" integer`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ADD "isSlowArchive" boolean`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ALTER COLUMN "endDate" SET NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ALTER COLUMN "concurrency" DROP DEFAULT`
		);
		await queryRunner.query(
			`ALTER TYPE "public"."history_archive_scan_v2_errortype_enum" RENAME TO "history_archive_scan_v2_errortype_enum_old"`
		);
		await queryRunner.query(
			`CREATE TYPE "public"."history_archive_scan_v2_errortype_enum" AS ENUM('0', '1')`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ALTER COLUMN "errorType" TYPE "public"."history_archive_scan_v2_errortype_enum" USING "errorType"::"text"::"public"."history_archive_scan_v2_errortype_enum"`
		);
		await queryRunner.query(
			`DROP TYPE "public"."history_archive_scan_v2_errortype_enum_old"`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "public"."history_archive_scan_v2_errortype_enum_old" AS ENUM('0', '1', '2')`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ALTER COLUMN "errorType" TYPE "public"."history_archive_scan_v2_errortype_enum_old" USING "errorType"::"text"::"public"."history_archive_scan_v2_errortype_enum_old"`
		);
		await queryRunner.query(
			`DROP TYPE "public"."history_archive_scan_v2_errortype_enum"`
		);
		await queryRunner.query(
			`ALTER TYPE "public"."history_archive_scan_v2_errortype_enum_old" RENAME TO "history_archive_scan_v2_errortype_enum"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ALTER COLUMN "concurrency" SET DEFAULT '50'`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ALTER COLUMN "endDate" DROP NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" DROP COLUMN "isSlowArchive"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" DROP COLUMN "toLedger"`
		);
	}
}
