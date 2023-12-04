import { MigrationInterface, QueryRunner } from 'typeorm';

export class Connectivity1700572695626 implements MigrationInterface {
	name = 'Connectivity1700572695626';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP INDEX IF EXISTS "public"."IDX_ad5b60bd93fc753f5a5b12bc6f"`
		);
		await queryRunner.query(
			`DROP INDEX IF EXISTS "public"."IDX_c24068b8094a20a9a4c8a0f7ff"`
		);
		await queryRunner.query(
			`DROP INDEX IF EXISTS "public"."IDX_a6427dcac5713566cbf8b7b016"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_details" DROP COLUMN "homeDomain"`
		);
		await queryRunner.query(`ALTER TABLE "node_details" DROP COLUMN "isp"`);
		await queryRunner.query(
			`ALTER TABLE "node_details" DROP COLUMN "ledgerVersion"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_details" DROP COLUMN "overlayVersion"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_details" DROP COLUMN "overlayMinVersion"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_details" DROP COLUMN "versionStr"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" ADD "connectivityError" boolean NOT NULL DEFAULT false`
		);
		await queryRunner.query(
			`alter sequence crawl_v2_id_seq rename to network_scan_id_seq`
		);
		await queryRunner.query(
			`ALTER TABLE "network_scan" ALTER COLUMN "id" DROP DEFAULT`
		);
		await queryRunner.query(
			`alter table network_scan alter column id set default nextval('network_scan_id_seq'::regclass);`
		);
		await queryRunner.query(
			`ALTER TABLE "network_scan" ALTER COLUMN "ledgers" SET DEFAULT '[]'`
		);
		await queryRunner.query(
			`ALTER TABLE "network_scan" ALTER COLUMN "latestLedgerCloseTime" DROP NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_scan" ALTER COLUMN "latestLedgerCloseTime" DROP DEFAULT`
		);
		await queryRunner.query(
			`ALTER TABLE "subscription" ALTER COLUMN "subscriptionDate" DROP DEFAULT`
		);
		await queryRunner.query(
			`ALTER TABLE "subscription_subscriber" ALTER COLUMN "registrationDate" DROP DEFAULT`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_4f5d2d4a407056c3acae918c2e" ON "network_scan" ("time", "completed") `
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP INDEX "public"."IDX_4f5d2d4a407056c3acae918c2e"`
		);
		await queryRunner.query(
			`ALTER TABLE "subscription_subscriber" ALTER COLUMN "registrationDate" SET DEFAULT '2021-11-22 14:26:12.325+00'`
		);
		await queryRunner.query(
			`ALTER TABLE "subscription" ALTER COLUMN "subscriptionDate" SET DEFAULT '2021-11-22 14:26:12.325+00'`
		);
		await queryRunner.query(
			`ALTER TABLE "network_scan" ALTER COLUMN "latestLedgerCloseTime" SET DEFAULT '1970-01-01 00:00:00+00'`
		);
		await queryRunner.query(
			`ALTER TABLE "network_scan" ALTER COLUMN "latestLedgerCloseTime" SET NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_scan" ALTER COLUMN "ledgers" SET DEFAULT ''`
		);
		await queryRunner.query(
			`ALTER TABLE "network_scan" ALTER COLUMN "id" SET DEFAULT nextval('crawl_v2_id_seq')`
		);
		await queryRunner.query(
			`ALTER TABLE "network_scan" ALTER COLUMN "id" DROP DEFAULT`
		);
		await queryRunner.query(
			`alter sequence network_scan_id_seq rename to crawl_v2_id_seq`
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" DROP COLUMN "connectivityError"`
		);
		await queryRunner.query(`ALTER TABLE "node_details" ADD "versionStr" text`);
		await queryRunner.query(
			`ALTER TABLE "node_details" ADD "overlayMinVersion" integer`
		);
		await queryRunner.query(
			`ALTER TABLE "node_details" ADD "overlayVersion" integer`
		);
		await queryRunner.query(
			`ALTER TABLE "node_details" ADD "ledgerVersion" integer`
		);
		await queryRunner.query(`ALTER TABLE "node_details" ADD "isp" text`);
		await queryRunner.query(`ALTER TABLE "node_details" ADD "homeDomain" text`);
		await queryRunner.query(
			`CREATE INDEX "IDX_a6427dcac5713566cbf8b7b016" ON "network" ("networkIdValue") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_c24068b8094a20a9a4c8a0f7ff" ON "network_change" ("networkIdValue") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_ad5b60bd93fc753f5a5b12bc6f" ON "network_change" ("type") `
		);
	}
}
