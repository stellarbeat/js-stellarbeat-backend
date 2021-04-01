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
   }

}
