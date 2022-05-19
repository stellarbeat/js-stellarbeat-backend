import { MigrationInterface, QueryRunner } from 'typeorm';

export class historyScan1652883888348 implements MigrationInterface {
	name = 'historyScan1652883888348';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "history_archive_scan" ("id" SERIAL NOT NULL, "startDate" TIMESTAMP WITH TIME ZONE NOT NULL, "endDate" TIMESTAMP WITH TIME ZONE NOT NULL, "fromLedger" bigint NOT NULL, "toLedger" bigint NOT NULL, "latestScannedLedger" bigint NOT NULL, "hasGap" boolean NOT NULL, "gapUrl" text, "gapCheckPoint" bigint, "hasError" boolean NOT NULL, "errorMessage" text, "errorStatus" smallint, "errorCode" text, "errorUrl" text, "concurrencyRangeIndex" smallint NOT NULL, "url" text NOT NULL, CONSTRAINT "PK_01635374d215f0f5dee81fd053f" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_82d68e5f2b46e4d4cb1406d149" ON "history_archive_scan" ("startDate") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_b49fc1e2a98573e693d8c7f696" ON "history_archive_scan" ("url") `
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "latestScannedLedger"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "hasGap"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "gapUrl"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "gapCheckPoint"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "hasError"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "errorMessage"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "errorStatus"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "errorCode"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "errorUrl"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "concurrencyRangeIndex"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "latestScannedLedger" bigint NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "hasGap" boolean NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "gapUrl" text`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "gapCheckPoint" bigint`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "hasError" boolean NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "errorMessage" text`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "errorStatus" smallint`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "errorCode" text`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "errorUrl" text`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "concurrencyRangeIndex" smallint NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "startDate"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "startDate" TIMESTAMP NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "endDate"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "endDate" TIMESTAMP NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "url"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "url" character varying NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "fromLedger"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "fromLedger" integer NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "toLedger"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "toLedger" integer NOT NULL`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "toLedger"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "toLedger" bigint NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "fromLedger"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "fromLedger" bigint NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "url"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "url" text NOT NULL`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_b49fc1e2a98573e693d8c7f696" ON "history_archive_scan" ("url") `
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "endDate"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "endDate" TIMESTAMP WITH TIME ZONE NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "startDate"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "startDate" TIMESTAMP WITH TIME ZONE NOT NULL`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_82d68e5f2b46e4d4cb1406d149" ON "history_archive_scan" ("startDate") `
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "concurrencyRangeIndex"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "errorUrl"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "errorCode"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "errorStatus"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "errorMessage"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "hasError"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "gapCheckPoint"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "gapUrl"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "hasGap"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" DROP COLUMN "latestScannedLedger"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "concurrencyRangeIndex" smallint NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "errorUrl" text`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "errorCode" text`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "errorStatus" smallint`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "errorMessage" text`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "hasError" boolean NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "gapCheckPoint" bigint`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "gapUrl" text`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "hasGap" boolean NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan" ADD "latestScannedLedger" bigint NOT NULL`
		);
		await queryRunner.query(`DROP TABLE "history_archive_scan"`);
	}
}
