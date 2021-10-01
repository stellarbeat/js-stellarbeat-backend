import { MigrationInterface, QueryRunner } from 'typeorm';

export class fbasCleanup1617262226234 implements MigrationInterface {
	name = 'fbasRefactoring1617262226234';

	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`CREATE TABLE "network_measurement_update" ("id" SERIAL NOT NULL, "startCrawlId" int NOT NULL DEFAULT 0, "endCrawlId" int NOT NULL DEFAULT 0, CONSTRAINT "PK_964afecb805f6001235ffb21492" PRIMARY KEY ("id"))`,
			undefined
		);
		await queryRunner.query(
			`alter table "node_details" alter column "ledgerVersion" type integer using "ledgerVersion"::integer`,
			undefined
		);
		await queryRunner.query(
			`alter table node_details alter column "overlayVersion" type integer using "overlayVersion"::integer`,
			undefined
		);
		await queryRunner.query(
			`alter table node_details alter column "overlayMinVersion" type integer using "overlayMinVersion"::integer`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" DROP COLUMN "topTierFilteredSize"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" DROP COLUMN "topTierOrgsFilteredSize"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" DROP COLUMN "hasQuorumIntersectionFiltered"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" DROP COLUMN "minSplittingSetFilteredSize"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" DROP COLUMN "minSplittingSetOrgsFilteredSize"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "hasQuorumIntersectionFilteredCount"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "topTierFilteredMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "topTierFilteredMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "topTierOrgsFilteredMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "topTierOrgsFilteredMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minSplittingSetFilteredMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minSplittingSetFilteredMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minSplittingSetOrgsFilteredMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minSplittingSetOrgsFilteredMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "topTierFilteredSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "topTierOrgsFilteredSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minSplittingSetFilteredSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minSplittingSetOrgsFilteredSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "hasQuorumIntersectionFilteredCount"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "topTierFilteredMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "topTierFilteredMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "topTierOrgsFilteredMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "topTierOrgsFilteredMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minSplittingSetFilteredMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minSplittingSetFilteredMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minSplittingSetOrgsFilteredMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minSplittingSetOrgsFilteredMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "topTierFilteredSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "topTierOrgsFilteredSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minSplittingSetFilteredSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minSplittingSetOrgsFilteredSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "minBlockingSetCountrySize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "hasSymmetricTopTier" boolean NOT NULL DEFAULT false`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "hasSymmetricTopTierCount" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "hasSymmetricTopTierCount" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "minBlockingSetCountryFilteredSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "minBlockingSetISPSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "minBlockingSetISPFilteredSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetCountryMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetCountryMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetCountrySum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetCountryFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetCountryFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetCountryFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetISPMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetISPMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetISPSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetISPFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetISPFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetISPFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetCountryMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetCountryMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetCountrySum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetCountryFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetCountryFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetCountryFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetISPMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetISPMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetISPSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetISPFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetISPFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetISPFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetISPMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetISPMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetISPSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetCountryMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetCountryMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetCountrySum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetISPMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetISPMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetISPSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetCountryMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetCountryMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetCountrySum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "minSplittingSetCountrySize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "minSplittingSetISPSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`DROP TABLE "network_measurement_update"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "topTierFilteredSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "topTierOrgsFilteredSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "hasQuorumIntersectionFiltered" boolean NOT NULL DEFAULT false`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "minSplittingSetFilteredSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "minSplittingSetOrgsFilteredSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "hasQuorumIntersectionFilteredCount" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "topTierFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "topTierFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "topTierFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "topTierOrgsFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "topTierOrgsFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "topTierOrgsFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "hasQuorumIntersectionFilteredCount" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "topTierFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "topTierFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "topTierFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "topTierOrgsFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "topTierOrgsFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "topTierOrgsFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetOrgsFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetOrgsFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetOrgsFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minBlockingSetISPFilteredSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minBlockingSetISPFilteredMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minBlockingSetISPFilteredMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minBlockingSetISPSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minBlockingSetISPMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minBlockingSetISPMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minBlockingSetCountryFilteredSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minBlockingSetCountryFilteredMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minBlockingSetCountryFilteredMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minBlockingSetCountrySum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minBlockingSetCountryMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" DROP COLUMN "minBlockingSetCountryMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minBlockingSetISPFilteredSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minBlockingSetISPFilteredMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minBlockingSetISPFilteredMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minBlockingSetISPSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minBlockingSetISPMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minBlockingSetISPMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minBlockingSetCountryFilteredSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minBlockingSetCountryFilteredMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minBlockingSetCountryFilteredMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minBlockingSetCountrySum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minBlockingSetCountryMax"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" DROP COLUMN "minBlockingSetCountryMin"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" DROP COLUMN "minBlockingSetISPFilteredSize"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" DROP COLUMN "minBlockingSetISPSize"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" DROP COLUMN "minBlockingSetCountryFilteredSize"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" DROP COLUMN "minBlockingSetCountrySize"`,
			undefined
		);
	}
}
