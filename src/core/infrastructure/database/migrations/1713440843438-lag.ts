import { MigrationInterface, QueryRunner } from "typeorm";

export class Lag1713440843438 implements MigrationInterface {
    name = 'Lag1713440843438'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "node_measurement_v2" ADD "lag" smallint NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "node_measurement_v2" DROP COLUMN "lag"`);
    }

}
