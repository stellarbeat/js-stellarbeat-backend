import {MigrationInterface, QueryRunner} from "typeorm";

export class uniqueNetworkId1673434349044 implements MigrationInterface {
    name = 'uniqueNetworkId1673434349044'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_7867970695572b3f6561516414"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ad5b60bd93fc753f5a5b12bc6f"`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "network_update_id_seq" OWNED BY "network_update"."id"`);
        await queryRunner.query(`ALTER TABLE "network_update" ALTER COLUMN "id" SET DEFAULT nextval('"network_update_id_seq"')`);
        await queryRunner.query(`ALTER TABLE "network_update" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "network_update" ALTER COLUMN "latestLedgerCloseTime" SET DEFAULT '"1970-01-01T00:00:00.000Z"'`);
        await queryRunner.query(`ALTER TABLE "network_change" ADD CONSTRAINT "UQ_c24068b8094a20a9a4c8a0f7ff0" UNIQUE ("networkIdValue")`);
        await queryRunner.query(`ALTER TABLE "network" ADD CONSTRAINT "UQ_a6427dcac5713566cbf8b7b0162" UNIQUE ("networkIdValue")`);
        await queryRunner.query(`ALTER TABLE "subscription_subscriber" ALTER COLUMN "registrationDate" SET DEFAULT '"2023-01-11T10:52:30.709Z"'`);
        await queryRunner.query(`ALTER TABLE "subscription" ALTER COLUMN "subscriptionDate" SET DEFAULT '"2023-01-11T10:52:30.709Z"'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_be8f4f456d02c4e1a283e1abef" ON "organization" ("organizationIdValue") `);
        await queryRunner.query(`CREATE INDEX "IDX_fdfaec91a32fc3f519cdbeed15" ON "network_update" ("time", "completed") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_fdfaec91a32fc3f519cdbeed15"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_be8f4f456d02c4e1a283e1abef"`);
        await queryRunner.query(`ALTER TABLE "subscription" ALTER COLUMN "subscriptionDate" SET DEFAULT '2021-11-22 14:26:12.325+00'`);
        await queryRunner.query(`ALTER TABLE "subscription_subscriber" ALTER COLUMN "registrationDate" SET DEFAULT '2021-11-22 14:26:12.325+00'`);
        await queryRunner.query(`ALTER TABLE "network" DROP CONSTRAINT "UQ_a6427dcac5713566cbf8b7b0162"`);
        await queryRunner.query(`ALTER TABLE "network_change" DROP CONSTRAINT "UQ_c24068b8094a20a9a4c8a0f7ff0"`);
        await queryRunner.query(`ALTER TABLE "network_update" ALTER COLUMN "latestLedgerCloseTime" SET DEFAULT '1970-01-01 00:00:00+00'`);
        await queryRunner.query(`ALTER TABLE "network_update" ALTER COLUMN "id" SET DEFAULT nextval('crawl_v2_id_seq')`);
        await queryRunner.query(`ALTER TABLE "network_update" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "network_update_id_seq"`);
        await queryRunner.query(`CREATE INDEX "IDX_ad5b60bd93fc753f5a5b12bc6f" ON "network_change" ("type") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7867970695572b3f6561516414" ON "organization" ("organizationIdValue") `);
    }

}
