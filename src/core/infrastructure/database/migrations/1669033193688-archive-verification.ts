import { MigrationInterface, QueryRunner } from 'typeorm';

export class archiveVerification1669033193688 implements MigrationInterface {
	name = 'archiveVerification1669033193688';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "public"."history_archive_scan_v2_errortype_enum" AS ENUM('0', '1', '2')`
		);
		await queryRunner.query(
			`CREATE TABLE "history_archive_scan_v2" ("id" SERIAL NOT NULL, "initializeDate" TIMESTAMP WITH TIME ZONE NOT NULL, "startDate" TIMESTAMP WITH TIME ZONE NOT NULL, "endDate" TIMESTAMP WITH TIME ZONE, "fromLedger" integer NOT NULL, "latestScannedLedger" integer NOT NULL, "latestScannedLedgerHeaderHash" text, "errorType" "public"."history_archive_scan_v2_errortype_enum", "errorUrl" text, "errorMessage" text, "url" text NOT NULL, CONSTRAINT "PK_59c830b628ae5971770b4b1998d" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_57c104ef5acc7f90f31eb96b65" ON "history_archive_scan_v2" ("startDate") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_3a8fef51aef20e809665c8731c" ON "history_archive_scan_v2" ("url") `
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "history_archive_scan_v2"`);
		await queryRunner.query(
			`DROP TYPE "public"."history_archive_scan_v2_errortype_enum"`
		);
	}
}
