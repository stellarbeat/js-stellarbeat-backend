import {MigrationInterface, QueryRunner} from "typeorm";

export class timeTravel1571381802576 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
               await queryRunner.query(`CREATE TABLE "geo_data" ("id" SERIAL NOT NULL, "countryCode" character varying(10) NOT NULL, "countryName" character varying(255) NOT NULL, "latitude" numeric NOT NULL, "longitude" numeric NOT NULL, CONSTRAINT "PK_92625c9e39474c07ec99bd80114" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4623457c7f0178c4c5bc009d74" ON "geo_data" ("countryCode") `);
        await queryRunner.query(`CREATE TABLE "measurement_rollup" ("id" SERIAL NOT NULL, "name" text NOT NULL, "targetTableName" text NOT NULL, "lastAggregatedCrawlId" bigint NOT NULL DEFAULT 0, CONSTRAINT "PK_6939b44a12299db4fa2d2b84f88" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_96cca3cd3a2b15b1f20e5333c9" ON "measurement_rollup" ("name") `);
        await queryRunner.query(`CREATE TABLE "node_details" ("id" SERIAL NOT NULL, "host" text, "name" text, "homeDomain" text, "historyUrl" text, "alias" text, "isp" text, "ledgerVersion" text, "overlayVersion" text, "overlayMinVersion" text, "versionStr" text, CONSTRAINT "PK_673c6ff552b8dbf08a58caa4941" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "public_key" ("id" SERIAL NOT NULL, "publicKey" character varying(56) NOT NULL, CONSTRAINT "PK_d62252a04e5f1e6cecc6b0ef4fb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_71a75b413e30d9ab5a0d738576" ON "public_key" ("publicKey") `);
        await queryRunner.query(`CREATE TABLE "node_measurement_day_v2" ("day" TIMESTAMP WITH TIME ZONE NOT NULL, "publicKey" integer NOT NULL, "isActiveCount" smallint NOT NULL DEFAULT 0, "isValidatingCount" smallint NOT NULL DEFAULT 0, "isFullValidatorCount" smallint NOT NULL DEFAULT 0, "isOverloadedCount" smallint NOT NULL DEFAULT 0, "indexAverage" integer NOT NULL, "crawlCount" smallint NOT NULL DEFAULT 0, "publicKeyId" integer, CONSTRAINT "PK_e3de9f6080d96ea622fc202c694" PRIMARY KEY ("day", "publicKey"))`);
        await queryRunner.query(`CREATE TABLE "node_measurement_v2" ("crawl" integer NOT NULL, "publicKey" integer NOT NULL, "isActive" boolean NOT NULL, "isValidating" boolean NOT NULL, "isFullValidator" boolean NOT NULL, "isOverLoaded" boolean NOT NULL, "index" smallint NOT NULL, "crawlId" integer, "publicKeyId" integer, CONSTRAINT "PK_79316a0070f06b3091ecc23fda2" PRIMARY KEY ("crawl", "publicKey"))`);
        await queryRunner.query(`CREATE TABLE "quorum_set" ("id" SERIAL NOT NULL, "hash" character varying(64) NOT NULL, "quorumSetJson" json NOT NULL, CONSTRAINT "PK_ddb6d37225cdcf17c9e7a007c9b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e04910d38051178d76d23a2ab5" ON "quorum_set" ("hash") `);
        await queryRunner.query(`CREATE TABLE "organization_id" ("id" SERIAL NOT NULL, "organizationId" text NOT NULL, CONSTRAINT "PK_16feab421e5995fc728fe061327" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a62f50a71c4dd451e5e149f176" ON "organization_id" ("organizationId") `);
        await queryRunner.query(`CREATE TABLE "organizationV2" ("id" SERIAL NOT NULL, "organizationJson" jsonb NOT NULL, "organizationIdId" integer NOT NULL, CONSTRAINT "PK_9a82d038d6308fc314ebeec423a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "nodeV2" ("id" SERIAL NOT NULL, "ip" inet NOT NULL, "port" integer NOT NULL, "publicKeyId" integer, "nodeDetailsId" integer, "quorumSetId" integer, "geoDataId" integer, "organizationIdId" integer, "crawlStartId" integer NOT NULL, "crawlEndId" integer, CONSTRAINT "PK_3f6cc7f031565c1ab177aedac1c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "organization_measurement" ("crawl" integer NOT NULL, "organizationId" integer NOT NULL, "isSubQuorumAvailable" boolean NOT NULL, "index" smallint NOT NULL, "crawlId" integer, "organizationIdId" integer, CONSTRAINT "PK_116c9257adf228cf3d327c9bd9a" PRIMARY KEY ("crawl", "organizationId"))`);
        await queryRunner.query(`CREATE TABLE "organization_measurement_day" ("day" TIMESTAMP WITH TIME ZONE NOT NULL, "organizationId" integer NOT NULL, "isSubQuorumAvailableCount" smallint NOT NULL DEFAULT 0, "indexAverage" integer NOT NULL, "crawlCount" smallint NOT NULL DEFAULT 0, "organizationIdId" integer, CONSTRAINT "PK_4f98f0dcee54a6a14b9ccacc5b1" PRIMARY KEY ("day", "organizationId"))`);
        await queryRunner.query(`CREATE TABLE "time_travel_migration" ("id" SERIAL NOT NULL, "lastMigratedCrawl" integer NOT NULL, CONSTRAINT "PK_61ad130eddb110597df72530985" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "node_measurement_day_v2" ADD CONSTRAINT "FK_0e79ee3fc99b85ff64582cca9b9" FOREIGN KEY ("publicKeyId") REFERENCES "public_key"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "node_measurement_v2" ADD CONSTRAINT "FK_f23e6baf677e5aeda1ebb03131a" FOREIGN KEY ("crawlId") REFERENCES "crawl"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "node_measurement_v2" ADD CONSTRAINT "FK_f033e005c8a535c8b8083433eae" FOREIGN KEY ("publicKeyId") REFERENCES "public_key"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizationV2" ADD CONSTRAINT "FK_eff7d69933089ee10474b3a89ee" FOREIGN KEY ("organizationIdId") REFERENCES "organization_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nodeV2" ADD CONSTRAINT "FK_fc35a4547b15ef4c10db9060609" FOREIGN KEY ("publicKeyId") REFERENCES "public_key"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nodeV2" ADD CONSTRAINT "FK_1556f5bb92d32f0000a7a8c71d8" FOREIGN KEY ("nodeDetailsId") REFERENCES "node_details"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nodeV2" ADD CONSTRAINT "FK_9f72753e19f14aacb3b0b09b901" FOREIGN KEY ("quorumSetId") REFERENCES "quorum_set"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nodeV2" ADD CONSTRAINT "FK_916548afd916e502b0aac25b769" FOREIGN KEY ("geoDataId") REFERENCES "geo_data"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nodeV2" ADD CONSTRAINT "FK_b84a440467c38e0b7b0f78d82b8" FOREIGN KEY ("organizationIdId") REFERENCES "geo_data"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nodeV2" ADD CONSTRAINT "FK_4db3ce6111f2b7ffefaceb02e83" FOREIGN KEY ("crawlStartId") REFERENCES "crawl"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nodeV2" ADD CONSTRAINT "FK_1268e8d0624d056ab3189e27cc3" FOREIGN KEY ("crawlEndId") REFERENCES "crawl"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_measurement" ADD CONSTRAINT "FK_470d58ea5e6bfe40e6b628f0c41" FOREIGN KEY ("crawlId") REFERENCES "crawl"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_measurement" ADD CONSTRAINT "FK_e9a69d906d044b5e4a1aa29eacd" FOREIGN KEY ("organizationIdId") REFERENCES "organization_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_measurement_day" ADD CONSTRAINT "FK_eb3c338436139ed1fd8d3752872" FOREIGN KEY ("organizationIdId") REFERENCES "organization_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "organization_measurement_day" DROP CONSTRAINT "FK_eb3c338436139ed1fd8d3752872"`);
        await queryRunner.query(`ALTER TABLE "organization_measurement" DROP CONSTRAINT "FK_e9a69d906d044b5e4a1aa29eacd"`);
        await queryRunner.query(`ALTER TABLE "organization_measurement" DROP CONSTRAINT "FK_470d58ea5e6bfe40e6b628f0c41"`);
        await queryRunner.query(`ALTER TABLE "nodeV2" DROP CONSTRAINT "FK_1268e8d0624d056ab3189e27cc3"`);
        await queryRunner.query(`ALTER TABLE "nodeV2" DROP CONSTRAINT "FK_4db3ce6111f2b7ffefaceb02e83"`);
        await queryRunner.query(`ALTER TABLE "nodeV2" DROP CONSTRAINT "FK_b84a440467c38e0b7b0f78d82b8"`);
        await queryRunner.query(`ALTER TABLE "nodeV2" DROP CONSTRAINT "FK_916548afd916e502b0aac25b769"`);
        await queryRunner.query(`ALTER TABLE "nodeV2" DROP CONSTRAINT "FK_9f72753e19f14aacb3b0b09b901"`);
        await queryRunner.query(`ALTER TABLE "nodeV2" DROP CONSTRAINT "FK_1556f5bb92d32f0000a7a8c71d8"`);
        await queryRunner.query(`ALTER TABLE "nodeV2" DROP CONSTRAINT "FK_fc35a4547b15ef4c10db9060609"`);
        await queryRunner.query(`ALTER TABLE "organizationV2" DROP CONSTRAINT "FK_eff7d69933089ee10474b3a89ee"`);
        await queryRunner.query(`ALTER TABLE "node_measurement_v2" DROP CONSTRAINT "FK_f033e005c8a535c8b8083433eae"`);
        await queryRunner.query(`ALTER TABLE "node_measurement_v2" DROP CONSTRAINT "FK_f23e6baf677e5aeda1ebb03131a"`);
        await queryRunner.query(`ALTER TABLE "node_measurement_day_v2" DROP CONSTRAINT "FK_0e79ee3fc99b85ff64582cca9b9"`);
        await queryRunner.query(`DROP TABLE "time_travel_migration"`);
        await queryRunner.query(`DROP TABLE "organization_measurement_day"`);
        await queryRunner.query(`DROP TABLE "organization_measurement"`);
        await queryRunner.query(`DROP TABLE "nodeV2"`);
        await queryRunner.query(`DROP TABLE "organizationV2"`);
        await queryRunner.query(`DROP INDEX "IDX_a62f50a71c4dd451e5e149f176"`);
        await queryRunner.query(`DROP TABLE "organization_id"`);
        await queryRunner.query(`DROP INDEX "IDX_e04910d38051178d76d23a2ab5"`);
        await queryRunner.query(`DROP TABLE "quorum_set"`);
        await queryRunner.query(`DROP TABLE "node_measurement_v2"`);
        await queryRunner.query(`DROP TABLE "node_measurement_day_v2"`);
        await queryRunner.query(`DROP INDEX "IDX_71a75b413e30d9ab5a0d738576"`);
        await queryRunner.query(`DROP TABLE "public_key"`);
        await queryRunner.query(`DROP TABLE "node_details"`);
        await queryRunner.query(`DROP INDEX "IDX_96cca3cd3a2b15b1f20e5333c9"`);
        await queryRunner.query(`DROP TABLE "measurement_rollup"`);
        await queryRunner.query(`DROP INDEX "IDX_4623457c7f0178c4c5bc009d74"`);
        await queryRunner.query(`DROP TABLE "geo_data"`);
    }

}
