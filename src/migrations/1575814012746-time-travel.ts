import {MigrationInterface, QueryRunner} from "typeorm";

export class timeTravel1575814012746 implements MigrationInterface {
    name = 'timeTravel1575814012746'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "crawl_v2" ("id" SERIAL NOT NULL, "time" TIMESTAMP WITH TIME ZONE NOT NULL, "ledgers" text NOT NULL DEFAULT '', CONSTRAINT "PK_2284a12c78d3a77e4509882e7ff" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_98478f00396383082f51007a7d" ON "crawl_v2" ("time") `, undefined);
        await queryRunner.query(`CREATE TABLE "geo_data" ("id" SERIAL NOT NULL, "countryCode" character varying(10), "countryName" character varying(255), "latitude" numeric, "longitude" numeric, CONSTRAINT "PK_92625c9e39474c07ec99bd80114" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_4623457c7f0178c4c5bc009d74" ON "geo_data" ("countryCode") `, undefined);
        await queryRunner.query(`CREATE TABLE "measurement_rollup" ("id" SERIAL NOT NULL, "name" text NOT NULL, "targetTableName" text NOT NULL, "lastAggregatedCrawlId" bigint NOT NULL DEFAULT 0, CONSTRAINT "PK_6939b44a12299db4fa2d2b84f88" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_96cca3cd3a2b15b1f20e5333c9" ON "measurement_rollup" ("name") `, undefined);
        await queryRunner.query(`CREATE TABLE "node_details" ("id" SERIAL NOT NULL, "host" text, "name" text, "homeDomain" text, "historyUrl" text, "alias" text, "isp" text, "ledgerVersion" text NOT NULL, "overlayVersion" text NOT NULL, "overlayMinVersion" text NOT NULL, "versionStr" text NOT NULL, CONSTRAINT "PK_673c6ff552b8dbf08a58caa4941" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "node_measurement_day_v2" ("day" TIMESTAMP WITH TIME ZONE NOT NULL, "publicKey" character varying(56) NOT NULL, "isActiveCount" smallint NOT NULL DEFAULT 0, "isValidatingCount" smallint NOT NULL DEFAULT 0, "isFullValidatorCount" smallint NOT NULL DEFAULT 0, "isOverloadedCount" smallint NOT NULL DEFAULT 0, "indexAverage" integer NOT NULL, "crawlCount" smallint NOT NULL DEFAULT 0, CONSTRAINT "PK_842c64ee9774c902f978fb37082" PRIMARY KEY ("day"))`, undefined);
        await queryRunner.query(`CREATE TABLE "node_measurement_v2" ("crawl" integer NOT NULL, "publicKey" character varying(56) NOT NULL, "isActive" boolean NOT NULL, "isValidating" boolean NOT NULL, "isFullValidator" boolean NOT NULL, "isOverLoaded" boolean NOT NULL, "index" smallint NOT NULL, "crawlId" integer, CONSTRAINT "PK_79316a0070f06b3091ecc23fda2" PRIMARY KEY ("crawl", "publicKey"))`, undefined);
        await queryRunner.query(`CREATE TABLE "quorum_set" ("id" SERIAL NOT NULL, "hash" character varying(64) NOT NULL, "quorumSetJson" json NOT NULL, CONSTRAINT "PK_ddb6d37225cdcf17c9e7a007c9b" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_e04910d38051178d76d23a2ab5" ON "quorum_set" ("hash") `, undefined);
        await queryRunner.query(`CREATE TABLE "organization_id" ("id" SERIAL NOT NULL, "organizationId" text NOT NULL, CONSTRAINT "PK_16feab421e5995fc728fe061327" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a62f50a71c4dd451e5e149f176" ON "organization_id" ("organizationId") `, undefined);
        await queryRunner.query(`CREATE TABLE "organizationV2" ("id" SERIAL NOT NULL, "organizationJson" jsonb NOT NULL, "organizationIdId" integer NOT NULL, CONSTRAINT "PK_9a82d038d6308fc314ebeec423a" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "node_v2" ("id" SERIAL NOT NULL, "publicKey" character varying(56) NOT NULL, "dateDiscovered" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_34c2ab6628fdaf425b55dbd15ca" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8ffc76c5504d42b024d886a9c4" ON "node_v2" ("publicKey") `, undefined);
        await queryRunner.query(`CREATE TABLE "node_snap_shot" ("id" SERIAL NOT NULL, "ip" inet NOT NULL, "port" integer NOT NULL, "startDate" TIMESTAMP WITH TIME ZONE NOT NULL, "endDate" TIMESTAMP WITH TIME ZONE NOT NULL, "current" boolean NOT NULL, "nodeStorageId" integer, "nodeDetailsId" integer, "quorumSetId" integer, "geoDataId" integer, "organizationId" integer, CONSTRAINT "PK_ba6f2e2ed7527e6e2d6e2af7d8f" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_3b0a9c50f9982317dcecfb38ad" ON "node_snap_shot" ("nodeStorageId") `, undefined);
        await queryRunner.query(`CREATE TABLE "organization_measurement" ("crawl" integer NOT NULL, "organizationId" integer NOT NULL, "isSubQuorumAvailable" boolean NOT NULL, "index" smallint NOT NULL, "crawlId" integer, "organizationIdId" integer, CONSTRAINT "PK_116c9257adf228cf3d327c9bd9a" PRIMARY KEY ("crawl", "organizationId"))`, undefined);
        await queryRunner.query(`CREATE TABLE "organization_measurement_day" ("day" TIMESTAMP WITH TIME ZONE NOT NULL, "organizationId" integer NOT NULL, "isSubQuorumAvailableCount" smallint NOT NULL DEFAULT 0, "indexAverage" integer NOT NULL, "crawlCount" smallint NOT NULL DEFAULT 0, "organizationIdId" integer, CONSTRAINT "PK_4f98f0dcee54a6a14b9ccacc5b1" PRIMARY KEY ("day", "organizationId"))`, undefined);
        await queryRunner.query(`CREATE TABLE "time_travel_migration" ("id" SERIAL NOT NULL, "lastMigratedCrawl" integer NOT NULL, CONSTRAINT "PK_61ad130eddb110597df72530985" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`ALTER TABLE "node_measurement_v2" ADD CONSTRAINT "FK_f23e6baf677e5aeda1ebb03131a" FOREIGN KEY ("crawlId") REFERENCES "crawl_v2"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "organizationV2" ADD CONSTRAINT "FK_eff7d69933089ee10474b3a89ee" FOREIGN KEY ("organizationIdId") REFERENCES "organization_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "node_snap_shot" ADD CONSTRAINT "FK_3b0a9c50f9982317dcecfb38ad8" FOREIGN KEY ("nodeStorageId") REFERENCES "node_v2"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "node_snap_shot" ADD CONSTRAINT "FK_98624f1f1018f09e36fbf0c3ae9" FOREIGN KEY ("nodeDetailsId") REFERENCES "node_details"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "node_snap_shot" ADD CONSTRAINT "FK_98fe4af527f4c6367c9519a651d" FOREIGN KEY ("quorumSetId") REFERENCES "quorum_set"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "node_snap_shot" ADD CONSTRAINT "FK_59a2a47590ce5d80cc960ab878c" FOREIGN KEY ("geoDataId") REFERENCES "geo_data"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "node_snap_shot" ADD CONSTRAINT "FK_918803f8e9401b1158af03c35fa" FOREIGN KEY ("organizationId") REFERENCES "organizationV2"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "organization_measurement" ADD CONSTRAINT "FK_470d58ea5e6bfe40e6b628f0c41" FOREIGN KEY ("crawlId") REFERENCES "crawl_v2"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "organization_measurement" ADD CONSTRAINT "FK_e9a69d906d044b5e4a1aa29eacd" FOREIGN KEY ("organizationIdId") REFERENCES "organization_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "organization_measurement_day" ADD CONSTRAINT "FK_eb3c338436139ed1fd8d3752872" FOREIGN KEY ("organizationIdId") REFERENCES "organization_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
    }

}
