import { MigrationInterface, QueryRunner } from 'typeorm';

export class fbas1598083624409 implements MigrationInterface {
	name = 'fbas1598083624409';

	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`truncate table network_measurement`, undefined);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" DROP CONSTRAINT "FK_79ec5be1f865283046da58a04c2"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" DROP CONSTRAINT "PK_79ec5be1f865283046da58a04c2"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" DROP COLUMN "crawlId"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "time" TIMESTAMP WITH TIME ZONE NOT NULL`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD CONSTRAINT "PK_2854ef5633cc3d267763bba88a7" PRIMARY KEY ("time")`,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "network_measurement_month" ("time" date NOT NULL, "nrOfActiveWatchersSum" integer NOT NULL, "nrOfActiveValidatorsSum" integer NOT NULL, "nrOfActiveFullValidatorsSum" integer NOT NULL, "nrOfActiveOrganizationsSum" integer NOT NULL, "transitiveQuorumSetSizeSum" integer NOT NULL, "hasQuorumIntersectionCount" smallint NOT NULL, "hasQuorumIntersectionFilteredCount" smallint NOT NULL, "topTierMin" smallint NOT NULL, "topTierMax" smallint NOT NULL, "topTierFilteredMin" smallint NOT NULL, "topTierFilteredMax" smallint NOT NULL, "topTierOrgsMin" smallint NOT NULL, "topTierOrgsMax" smallint NOT NULL, "topTierOrgsFilteredMin" smallint NOT NULL, "topTierOrgsFilteredMax" smallint NOT NULL, "minBlockingSetMin" smallint NOT NULL, "minBlockingSetMax" smallint NOT NULL, "minBlockingSetOrgsMin" smallint NOT NULL, "minBlockingSetOrgsMax" smallint NOT NULL, "minBlockingSetFilteredMin" smallint NOT NULL, "minBlockingSetFilteredMax" smallint NOT NULL, "minBlockingSetOrgsFilteredMin" smallint NOT NULL, "minBlockingSetOrgsFilteredMax" smallint NOT NULL, "minSplittingSetMin" smallint NOT NULL, "minSplittingSetMax" smallint NOT NULL, "minSplittingSetOrgsMin" smallint NOT NULL, "minSplittingSetOrgsMax" smallint NOT NULL, "minSplittingSetFilteredMin" smallint NOT NULL, "minSplittingSetFilteredMax" smallint NOT NULL, "minSplittingSetOrgsFilteredMin" smallint NOT NULL, "minSplittingSetOrgsFilteredMax" smallint NOT NULL, "crawlCount" smallint NOT NULL, CONSTRAINT "PK_a91b85e392e5b8d3f0afc068a18" PRIMARY KEY ("time"))`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" RENAME COLUMN "nrOfActiveNodes" TO "nrOfActiveWatchers"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" RENAME COLUMN "nrOfValidators" TO "nrOfActiveValidators"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" RENAME COLUMN "nrOfFullValidators" TO "nrOfActiveFullValidators"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" RENAME COLUMN "nrOfOrganizations" TO "nrOfActiveOrganizations"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_day_v2" RENAME COLUMN "day" TO "time"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "organization_measurement_day" RENAME COLUMN "day" TO "time"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" RENAME COLUMN "day" TO "time"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" RENAME COLUMN "nrOfActiveNodesSum" TO "nrOfActiveWatchersSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" RENAME COLUMN "nrOfValidatorsSum" TO "nrOfActiveValidatorsSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" RENAME COLUMN "nrOfFullValidatorsSum" TO "nrOfActiveFullValidatorsSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" RENAME COLUMN "nrOfOrganizationsSum" TO "nrOfActiveOrganizationsSum"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "topTierSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "topTierFilteredSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "topTierOrgsSize" smallint NOT NULL DEFAULT 0`,
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
			`ALTER TABLE "network_measurement" ADD "minBlockingSetSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "hasTransitiveQuorumSet" boolean NOT NULL DEFAULT false`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "minBlockingSetOrgsSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "minBlockingSetFilteredSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "minBlockingSetOrgsFilteredSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "minSplittingSetSize" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD "minSplittingSetOrgsSize" smallint NOT NULL DEFAULT 0`,
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
			`ALTER TABLE "network_measurement_day" ADD "hasTransitiveQuorumSetCount" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "topTierMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "topTierMax" smallint NOT NULL DEFAULT 0`,
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
			`ALTER TABLE "network_measurement_day" ADD "topTierOrgsMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "topTierOrgsMax" smallint NOT NULL DEFAULT 0`,
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
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetOrgsMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetOrgsMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetOrgsFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetOrgsFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsMax" smallint NOT NULL DEFAULT 0`,
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
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsFilteredMin" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsFilteredMax" smallint NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ALTER COLUMN "transitiveQuorumSetSize" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ALTER COLUMN "hasQuorumIntersection" SET DEFAULT false`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ALTER COLUMN "transitiveQuorumSetSizeSum" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ALTER COLUMN "hasQuorumIntersectionCount" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ALTER COLUMN "crawlCount" SET DEFAULT 0`,
			undefined
		);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {}
}
