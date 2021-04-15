import {MigrationInterface, QueryRunner} from "typeorm";

export class fbasCleanup1617262226234 implements MigrationInterface {
    name = 'fbasCleanup1617262226234'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "network_measurement" DROP COLUMN "topTierFilteredSize"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" DROP COLUMN "topTierOrgsFilteredSize"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" DROP COLUMN "hasQuorumIntersectionFiltered"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" DROP COLUMN "minSplittingSetFilteredSize"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" DROP COLUMN "minSplittingSetOrgsFilteredSize"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" DROP COLUMN "hasQuorumIntersectionFilteredCount"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" DROP COLUMN "topTierFilteredMin"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" DROP COLUMN "topTierFilteredMax"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" DROP COLUMN "topTierOrgsFilteredMin"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" DROP COLUMN "topTierOrgsFilteredMax"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" DROP COLUMN "minSplittingSetFilteredMin"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" DROP COLUMN "minSplittingSetFilteredMax"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" DROP COLUMN "minSplittingSetOrgsFilteredMin"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" DROP COLUMN "minSplittingSetOrgsFilteredMax"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" DROP COLUMN "topTierFilteredSum"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" DROP COLUMN "topTierOrgsFilteredSum"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" DROP COLUMN "minSplittingSetFilteredSum"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" DROP COLUMN "minSplittingSetOrgsFilteredSum"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" DROP COLUMN "hasQuorumIntersectionFilteredCount"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" DROP COLUMN "topTierFilteredMin"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" DROP COLUMN "topTierFilteredMax"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" DROP COLUMN "topTierOrgsFilteredMin"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" DROP COLUMN "topTierOrgsFilteredMax"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" DROP COLUMN "minSplittingSetFilteredMin"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" DROP COLUMN "minSplittingSetFilteredMax"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" DROP COLUMN "minSplittingSetOrgsFilteredMin"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" DROP COLUMN "minSplittingSetOrgsFilteredMax"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" DROP COLUMN "topTierFilteredSum"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" DROP COLUMN "topTierOrgsFilteredSum"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" DROP COLUMN "minSplittingSetFilteredSum"`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" DROP COLUMN "minSplittingSetOrgsFilteredSum"`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "topTierFilteredSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "topTierOrgsFilteredSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "hasQuorumIntersectionFiltered" boolean NOT NULL DEFAULT false`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "minSplittingSetFilteredSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement" ADD "minSplittingSetOrgsFilteredSize" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "hasQuorumIntersectionFilteredCount" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "topTierFilteredMin" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "topTierFilteredMax" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "topTierFilteredSum" integer NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "topTierOrgsFilteredMin" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "topTierOrgsFilteredMax" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "topTierOrgsFilteredSum" integer NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minSplittingSetFilteredMin" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minSplittingSetFilteredMax" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minSplittingSetFilteredSum" integer NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsFilteredMin" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsFilteredMax" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsFilteredSum" integer NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" ADD "hasQuorumIntersectionFilteredCount" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" ADD "topTierFilteredMin" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" ADD "topTierFilteredMax" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" ADD "topTierFilteredSum" integer NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" ADD "topTierOrgsFilteredMin" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" ADD "topTierOrgsFilteredMax" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" ADD "topTierOrgsFilteredSum" integer NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" ADD "minSplittingSetFilteredMin" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" ADD "minSplittingSetFilteredMax" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" ADD "minSplittingSetFilteredSum" integer NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" ADD "minSplittingSetOrgsFilteredMin" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" ADD "minSplittingSetOrgsFilteredMax" smallint NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "network_measurement_month" ADD "minSplittingSetOrgsFilteredSum" integer NOT NULL DEFAULT 0`, undefined);
    }


}
