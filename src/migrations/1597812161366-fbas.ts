import {MigrationInterface, QueryRunner} from "typeorm";

export class fbas1597812161366 implements MigrationInterface {
    name = 'fbas1597812161366'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "network_measurement_month" ("month" date NOT NULL, "nrOfActiveWatchersSum" integer NOT NULL, "nrOfActiveValidatorsSum" integer NOT NULL, "nrOfActiveFullValidatorsSum" integer NOT NULL, "nrOfActiveOrganizationsSum" integer NOT NULL, "transitiveQuorumSetSizeSum" integer NOT NULL, "hasQuorumIntersectionCount" smallint NOT NULL, "hasQuorumIntersectionFilteredCount" smallint NOT NULL, "topTierMin" smallint NOT NULL, "topTierMax" smallint NOT NULL, "topTierFilteredMin" smallint NOT NULL, "topTierFilteredMax" smallint NOT NULL, "topTierOrgsMin" smallint NOT NULL, "topTierOrgsMax" smallint NOT NULL, "topTierOrgsFilteredMin" smallint NOT NULL, "topTierOrgsFilteredMax" smallint NOT NULL, "minBlockingSetMin" smallint NOT NULL, "minBlockingSetMax" smallint NOT NULL, "minBlockingSetOrgsMin" smallint NOT NULL, "minBlockingSetOrgsMax" smallint NOT NULL, "minBlockingSetFilteredMin" smallint NOT NULL, "minBlockingSetFilteredMax" smallint NOT NULL, "minBlockingSetOrgsFilteredMin" smallint NOT NULL, "minBlockingSetOrgsFilteredMax" smallint NOT NULL, "minSplittingSetMin" smallint NOT NULL, "minSplittingSetMax" smallint NOT NULL, "minSplittingSetOrgsMin" smallint NOT NULL, "minSplittingSetOrgsMax" smallint NOT NULL, "minSplittingSetFilteredMin" smallint NOT NULL, "minSplittingSetFilteredMax" smallint NOT NULL, "minSplittingSetOrgsFilteredMin" smallint NOT NULL, "minSplittingSetOrgsFilteredMax" smallint NOT NULL, "crawlCount" smallint NOT NULL, CONSTRAINT "PK_a91b85e392e5b8d3f0afc068a18" PRIMARY KEY ("month"))`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" RENAME COLUMN "nrOfActiveNodes" TO "nrOfActiveWatchers"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" RENAME COLUMN "nrOfValidators" TO "nrOfActiveValidators"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" RENAME COLUMN "nrOfFullValidators" TO "nrOfActiveFullValidators"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" RENAME COLUMN "nrOfOrganizations" TO "nrOfActiveOrganizations"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" RENAME COLUMN "nrOfActiveNodesSum" TO "nrOfActiveWatchersSum"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" RENAME COLUMN "nrOfValidatorsSum" TO "nrOfActiveValidatorsSum"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" RENAME COLUMN "nrOfFullValidatorsSum" TO "nrOfActiveFullValidatorsSum"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" RENAME COLUMN "nrOfOrganizationsSum" TO "nrOfActiveOrganizationsSum"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "topTierSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "topTierFilteredSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "topTierOrgsSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "topTierOrgsFilteredSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "hasQuorumIntersectionFiltered" boolean NOT NULL DEFAULT false`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "minBlockingSetSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "minBlockingSetOrgsSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "minBlockingSetFilteredSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "minBlockingSetOrgsFilteredSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "minSplittingSetSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "minSplittingSetOrgsSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "minSplittingSetFilteredSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "minSplittingSetOrgsFilteredSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "hasQuorumIntersectionFilteredCount" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "topTierMin" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "topTierMax" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "topTierFilteredMin" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "topTierFilteredMax" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "topTierOrgsMin" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "topTierOrgsMax" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "topTierOrgsFilteredMin" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "topTierOrgsFilteredMax" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minBlockingSetMin" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minBlockingSetMax" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minBlockingSetOrgsMin" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minBlockingSetOrgsMax" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minBlockingSetFilteredMin" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minBlockingSetFilteredMax" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minBlockingSetOrgsFilteredMin" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minBlockingSetOrgsFilteredMax" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minSplittingSetMin" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minSplittingSetMax" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsMin" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsMax" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minSplittingSetFilteredMin" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minSplittingSetFilteredMax" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsFilteredMin" smallint NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsFilteredMax" smallint NOT NULL`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
    }

}
