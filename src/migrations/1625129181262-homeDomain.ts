import { MigrationInterface, QueryRunner } from 'typeorm';

export class homeDomain1625129181262 implements MigrationInterface {
	name = 'homeDomain1625129181262';

	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ALTER COLUMN "nrOfActiveWatchers" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ALTER COLUMN "nrOfActiveValidators" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ALTER COLUMN "nrOfActiveFullValidators" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ALTER COLUMN "nrOfActiveOrganizations" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ALTER COLUMN "nrOfActiveWatchersSum" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ALTER COLUMN "nrOfActiveValidatorsSum" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ALTER COLUMN "nrOfActiveFullValidatorsSum" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ALTER COLUMN "nrOfActiveOrganizationsSum" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "nrOfActiveWatchersSum" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "nrOfActiveValidatorsSum" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "nrOfActiveFullValidatorsSum" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "nrOfActiveOrganizationsSum" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "transitiveQuorumSetSizeSum" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "hasQuorumIntersectionCount" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "topTierMin" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "topTierMax" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "topTierOrgsMin" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "topTierOrgsMax" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetMin" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetMax" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetOrgsMin" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetOrgsMax" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetFilteredMin" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetFilteredMax" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetOrgsFilteredMin" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetOrgsFilteredMax" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minSplittingSetMin" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minSplittingSetMax" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minSplittingSetOrgsMin" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minSplittingSetOrgsMax" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "crawlCount" SET DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_85f2fc256de520c118cd539cdf" ON "organization_snap_shot" ("OrganizationIdStorageId") `,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "organization_id" ADD "homeDomain" text`,
			undefined
		);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`ALTER TABLE "organization_id" DROP COLUMN "homeDomain"`,
			undefined
		);
		await queryRunner.query(
			`DROP INDEX "IDX_85f2fc256de520c118cd539cdf"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "crawlCount" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minSplittingSetOrgsMax" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minSplittingSetOrgsMin" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minSplittingSetMax" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minSplittingSetMin" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetOrgsFilteredMax" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetOrgsFilteredMin" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetFilteredMax" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetFilteredMin" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetOrgsMax" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetOrgsMin" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetMax" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "minBlockingSetMin" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "topTierOrgsMax" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "topTierOrgsMin" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "topTierMax" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "topTierMin" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "hasQuorumIntersectionCount" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "transitiveQuorumSetSizeSum" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "nrOfActiveOrganizationsSum" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "nrOfActiveFullValidatorsSum" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "nrOfActiveValidatorsSum" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ALTER COLUMN "nrOfActiveWatchersSum" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ALTER COLUMN "nrOfActiveOrganizationsSum" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ALTER COLUMN "nrOfActiveFullValidatorsSum" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ALTER COLUMN "nrOfActiveValidatorsSum" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ALTER COLUMN "nrOfActiveWatchersSum" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ALTER COLUMN "nrOfActiveOrganizations" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ALTER COLUMN "nrOfActiveFullValidators" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ALTER COLUMN "nrOfActiveValidators" DROP DEFAULT`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ALTER COLUMN "nrOfActiveWatchers" DROP DEFAULT`,
			undefined
		);
	}
}
