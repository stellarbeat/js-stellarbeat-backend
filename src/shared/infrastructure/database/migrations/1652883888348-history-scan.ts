import { MigrationInterface, QueryRunner } from 'typeorm';

export class historyScan1652883888348 implements MigrationInterface {
	name = 'historyScan1652883888348';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "history_archive_scan" ("id" SERIAL NOT NULL, "startDate" TIMESTAMP WITH TIME ZONE NOT NULL, "endDate" TIMESTAMP WITH TIME ZONE, "fromLedger" bigint NOT NULL, "toLedger" bigint NOT NULL, "latestScannedLedger" bigint NOT NULL, "hasGap" boolean NOT NULL, "gapUrl" text, "gapCheckPoint" bigint, "hasError" boolean NOT NULL, "errorMessage" text, "errorStatus" smallint, "errorCode" text, "errorUrl" text, "concurrencyRangeIndex" smallint NOT NULL, "url" text NOT NULL, CONSTRAINT "PK_01635374d215f0f5dee81fd053f" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_82d68e5f2b46e4d4cb1406d149" ON "history_archive_scan" ("startDate") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_b49fc1e2a98573e693d8c7f696" ON "history_archive_scan" ("url") `
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "history_archive_scan"`);
	}
}
