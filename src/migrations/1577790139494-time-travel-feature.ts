import { MigrationInterface, QueryRunner } from 'typeorm';

export class timeTravelFeature1577790139494 implements MigrationInterface {
	name = 'timeTravelFeature1577790139494';

	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`CREATE TABLE "crawl_v2" ("id" SERIAL NOT NULL, "time" TIMESTAMP WITH TIME ZONE NOT NULL, "ledgers" text NOT NULL DEFAULT '', "completed" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_2284a12c78d3a77e4509882e7ff" PRIMARY KEY ("id"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_f29698257a330e17d2260b84b5" ON "crawl_v2" ("time", "completed") `,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "measurement_rollup" ("id" SERIAL NOT NULL, "name" text NOT NULL, "targetTableName" text NOT NULL, "lastAggregatedCrawlId" bigint NOT NULL DEFAULT 0, CONSTRAINT "PK_6939b44a12299db4fa2d2b84f88" PRIMARY KEY ("id"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_96cca3cd3a2b15b1f20e5333c9" ON "measurement_rollup" ("name") `,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "network_measurement" ("nrOfActiveNodes" smallint NOT NULL, "nrOfValidators" smallint NOT NULL, "nrOfFullValidators" smallint NOT NULL, "nrOfOrganizations" smallint NOT NULL, "transitiveQuorumSetSize" smallint NOT NULL, "hasQuorumIntersection" boolean NOT NULL, "crawlId" integer NOT NULL, CONSTRAINT "PK_79ec5be1f865283046da58a04c2" PRIMARY KEY ("crawlId"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "network_measurement_day" ("day" date NOT NULL, "nrOfActiveNodesSum" integer NOT NULL, "nrOfValidatorsSum" integer NOT NULL, "nrOfFullValidatorsSum" integer NOT NULL, "nrOfOrganizationsSum" integer NOT NULL, "transitiveQuorumSetSizeSum" integer NOT NULL, "hasQuorumIntersectionCount" smallint NOT NULL, "crawlCount" smallint NOT NULL, CONSTRAINT "PK_0ce528aca19df6bbfe148c6a38c" PRIMARY KEY ("day"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "node_details" ("id" SERIAL NOT NULL, "host" text, "name" text, "homeDomain" text, "historyUrl" text, "alias" text, "isp" text, "ledgerVersion" text, "overlayVersion" text, "overlayMinVersion" text, "versionStr" text, CONSTRAINT "PK_673c6ff552b8dbf08a58caa4941" PRIMARY KEY ("id"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "node_geo_data" ("id" SERIAL NOT NULL, "countryCode" character varying(10), "countryName" character varying(255), "latitude" numeric, "longitude" numeric, CONSTRAINT "PK_e6b64005b5246af959b6674e03a" PRIMARY KEY ("id"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_4ed85d66ec92b2de06a3d9347a" ON "node_geo_data" ("countryCode") `,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "node_quorum_set" ("id" SERIAL NOT NULL, "hash" character varying(64) NOT NULL, "quorumSet" jsonb NOT NULL, CONSTRAINT "PK_f3f95102fddcbde60ec2b6ccce4" PRIMARY KEY ("id"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_eac828b0ad5d33d25203dd1147" ON "node_quorum_set" ("hash") `,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "organization_id" ("id" SERIAL NOT NULL, "organizationId" text NOT NULL, "dateDiscovered" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_16feab421e5995fc728fe061327" PRIMARY KEY ("id"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_a62f50a71c4dd451e5e149f176" ON "organization_id" ("organizationId") `,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "node_measurement_v2" ("time" TIMESTAMP WITH TIME ZONE NOT NULL, "nodePublicKeyStorageId" integer NOT NULL, "isActive" boolean NOT NULL, "isValidating" boolean NOT NULL, "isFullValidator" boolean NOT NULL, "isOverLoaded" boolean NOT NULL, "index" smallint NOT NULL, CONSTRAINT "PK_6c64e42ec8a59f27ba5e4debd26" PRIMARY KEY ("time", "nodePublicKeyStorageId"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "node_snap_shot" ("id" SERIAL NOT NULL, "ip" text NOT NULL, "port" integer NOT NULL, "startDate" TIMESTAMP WITH TIME ZONE NOT NULL, "endDate" TIMESTAMP WITH TIME ZONE NOT NULL, "ipChange" boolean NOT NULL, "NodePublicKeyId" integer NOT NULL, "NodeDetailsId" integer, "QuorumSetId" integer, "GeoDataId" integer, "OrganizationIdStorageId" integer, CONSTRAINT "PK_ba6f2e2ed7527e6e2d6e2af7d8f" PRIMARY KEY ("id"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_060186c5bac61307360d14b201" ON "node_snap_shot" ("NodePublicKeyId") `,
			undefined
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_a404acc6030092e403d93bbc3f" ON "node_snap_shot" ("startDate") `,
			undefined
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_9c5c7c050cfe2fe0db4587826e" ON "node_snap_shot" ("endDate") `,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "node_public_key" ("id" SERIAL NOT NULL, "publicKey" character varying(56) NOT NULL, "dateDiscovered" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_695a2c6ed3c824442370931221a" PRIMARY KEY ("id"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_cdbf727581401eb4fbe27af1f4" ON "node_public_key" ("publicKey") `,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "node_measurement_day_v2" ("day" date NOT NULL, "isActiveCount" smallint NOT NULL DEFAULT 0, "isValidatingCount" smallint NOT NULL DEFAULT 0, "isFullValidatorCount" smallint NOT NULL DEFAULT 0, "isOverloadedCount" smallint NOT NULL DEFAULT 0, "indexSum" integer NOT NULL, "crawlCount" smallint NOT NULL DEFAULT 0, "nodePublicKeyStorageId" integer NOT NULL, CONSTRAINT "PK_1aedd062771b591952c664b88c1" PRIMARY KEY ("day", "nodePublicKeyStorageId"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "organization_measurement" ("time" TIMESTAMP WITH TIME ZONE NOT NULL, "organizationIdStorageId" integer NOT NULL, "isSubQuorumAvailable" boolean NOT NULL, "index" smallint NOT NULL, CONSTRAINT "PK_e4b2a03164c957c8d1afd202127" PRIMARY KEY ("time", "organizationIdStorageId"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "organization_measurement_day" ("day" date NOT NULL, "isSubQuorumAvailableCount" smallint NOT NULL DEFAULT 0, "indexSum" integer NOT NULL, "crawlCount" smallint NOT NULL DEFAULT 0, "organizationIdStorageId" integer NOT NULL, CONSTRAINT "PK_5b88732de93210a33834ecf20c6" PRIMARY KEY ("day", "organizationIdStorageId"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "organization_snap_shot" ("id" SERIAL NOT NULL, "startDate" TIMESTAMP WITH TIME ZONE NOT NULL, "endDate" TIMESTAMP WITH TIME ZONE NOT NULL, "name" text NOT NULL, "dba" text, "url" text, "officialEmail" text, "phoneNumber" text, "physicalAddress" text, "twitter" text, "github" text, "description" text, "keybase" text, "OrganizationIdStorageId" integer NOT NULL, CONSTRAINT "PK_a2bae48b18ca043c625427610d2" PRIMARY KEY ("id"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_928f02c6083d690ee5e5bfdd07" ON "organization_snap_shot" ("startDate") `,
			undefined
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_35b22ea632f5ed70bf813368db" ON "organization_snap_shot" ("endDate") `,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "time_travel_migration" ("id" SERIAL NOT NULL, "lastMigratedCrawl" integer NOT NULL, CONSTRAINT "PK_61ad130eddb110597df72530985" PRIMARY KEY ("id"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE TABLE "organization_snap_shot_validators_node_public_key" ("organizationSnapShotId" integer NOT NULL, "nodePublicKeyId" integer NOT NULL, CONSTRAINT "PK_9d34cde6ac5c6ec5d586f3dca3d" PRIMARY KEY ("organizationSnapShotId", "nodePublicKeyId"))`,
			undefined
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_37d4aa0a922a70253a8c2eb81c" ON "organization_snap_shot_validators_node_public_key" ("organizationSnapShotId") `,
			undefined
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_e798d857886c247f2389af213a" ON "organization_snap_shot_validators_node_public_key" ("nodePublicKeyId") `,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" ADD CONSTRAINT "FK_79ec5be1f865283046da58a04c2" FOREIGN KEY ("crawlId") REFERENCES "crawl_v2"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" ADD CONSTRAINT "FK_503a29201385047923730812d35" FOREIGN KEY ("nodePublicKeyStorageId") REFERENCES "node_public_key"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" ADD CONSTRAINT "FK_060186c5bac61307360d14b201d" FOREIGN KEY ("NodePublicKeyId") REFERENCES "node_public_key"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" ADD CONSTRAINT "FK_52ed165b6c8be68944a862b14f2" FOREIGN KEY ("NodeDetailsId") REFERENCES "node_details"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" ADD CONSTRAINT "FK_6c8405ce2e60d457638f73861b7" FOREIGN KEY ("QuorumSetId") REFERENCES "node_quorum_set"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" ADD CONSTRAINT "FK_f2ea97f8bd0c6bf8f93bdf2179f" FOREIGN KEY ("GeoDataId") REFERENCES "node_geo_data"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" ADD CONSTRAINT "FK_00e668c81310ea1ec6e54d92b8c" FOREIGN KEY ("OrganizationIdStorageId") REFERENCES "organization_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_day_v2" ADD CONSTRAINT "FK_4aafe1b135546cb3a6bafe51c2f" FOREIGN KEY ("nodePublicKeyStorageId") REFERENCES "node_public_key"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "organization_measurement" ADD CONSTRAINT "FK_0a1c396753b5179c5c238ca601b" FOREIGN KEY ("organizationIdStorageId") REFERENCES "organization_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "organization_measurement_day" ADD CONSTRAINT "FK_4c64920c7b202687cab393cb613" FOREIGN KEY ("organizationIdStorageId") REFERENCES "organization_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot" ADD CONSTRAINT "FK_85f2fc256de520c118cd539cdf9" FOREIGN KEY ("OrganizationIdStorageId") REFERENCES "organization_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot_validators_node_public_key" ADD CONSTRAINT "FK_37d4aa0a922a70253a8c2eb81ca" FOREIGN KEY ("organizationSnapShotId") REFERENCES "organization_snap_shot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot_validators_node_public_key" ADD CONSTRAINT "FK_e798d857886c247f2389af213af" FOREIGN KEY ("nodePublicKeyId") REFERENCES "node_public_key"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
			undefined
		);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot_validators_node_public_key" DROP CONSTRAINT "FK_e798d857886c247f2389af213af"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot_validators_node_public_key" DROP CONSTRAINT "FK_37d4aa0a922a70253a8c2eb81ca"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot" DROP CONSTRAINT "FK_85f2fc256de520c118cd539cdf9"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "organization_measurement_day" DROP CONSTRAINT "FK_4c64920c7b202687cab393cb613"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "organization_measurement" DROP CONSTRAINT "FK_0a1c396753b5179c5c238ca601b"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_day_v2" DROP CONSTRAINT "FK_4aafe1b135546cb3a6bafe51c2f"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" DROP CONSTRAINT "FK_00e668c81310ea1ec6e54d92b8c"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" DROP CONSTRAINT "FK_f2ea97f8bd0c6bf8f93bdf2179f"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" DROP CONSTRAINT "FK_6c8405ce2e60d457638f73861b7"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" DROP CONSTRAINT "FK_52ed165b6c8be68944a862b14f2"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" DROP CONSTRAINT "FK_060186c5bac61307360d14b201d"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" DROP CONSTRAINT "FK_503a29201385047923730812d35"`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement" DROP CONSTRAINT "FK_79ec5be1f865283046da58a04c2"`,
			undefined
		);
		await queryRunner.query(
			`DROP INDEX "IDX_e798d857886c247f2389af213a"`,
			undefined
		);
		await queryRunner.query(
			`DROP INDEX "IDX_37d4aa0a922a70253a8c2eb81c"`,
			undefined
		);
		await queryRunner.query(
			`DROP TABLE "organization_snap_shot_validators_node_public_key"`,
			undefined
		);
		await queryRunner.query(`DROP TABLE "time_travel_migration"`, undefined);
		await queryRunner.query(
			`DROP INDEX "IDX_35b22ea632f5ed70bf813368db"`,
			undefined
		);
		await queryRunner.query(
			`DROP INDEX "IDX_928f02c6083d690ee5e5bfdd07"`,
			undefined
		);
		await queryRunner.query(`DROP TABLE "organization_snap_shot"`, undefined);
		await queryRunner.query(
			`DROP TABLE "organization_measurement_day"`,
			undefined
		);
		await queryRunner.query(`DROP TABLE "organization_measurement"`, undefined);
		await queryRunner.query(`DROP TABLE "node_measurement_day_v2"`, undefined);
		await queryRunner.query(
			`DROP INDEX "IDX_cdbf727581401eb4fbe27af1f4"`,
			undefined
		);
		await queryRunner.query(`DROP TABLE "node_public_key"`, undefined);
		await queryRunner.query(
			`DROP INDEX "IDX_9c5c7c050cfe2fe0db4587826e"`,
			undefined
		);
		await queryRunner.query(
			`DROP INDEX "IDX_060186c5bac61307360d14b201"`,
			undefined
		);
		await queryRunner.query(`DROP TABLE "node_snap_shot"`, undefined);
		await queryRunner.query(`DROP TABLE "node_measurement_v2"`, undefined);
		await queryRunner.query(
			`DROP INDEX "IDX_a62f50a71c4dd451e5e149f176"`,
			undefined
		);
		await queryRunner.query(`DROP TABLE "organization_id"`, undefined);
		await queryRunner.query(
			`DROP INDEX "IDX_eac828b0ad5d33d25203dd1147"`,
			undefined
		);
		await queryRunner.query(`DROP TABLE "node_quorum_set"`, undefined);
		await queryRunner.query(
			`DROP INDEX "IDX_4ed85d66ec92b2de06a3d9347a"`,
			undefined
		);
		await queryRunner.query(`DROP TABLE "node_geo_data"`, undefined);
		await queryRunner.query(`DROP TABLE "node_details"`, undefined);
		await queryRunner.query(`DROP TABLE "network_measurement_day"`, undefined);
		await queryRunner.query(`DROP TABLE "network_measurement"`, undefined);
		await queryRunner.query(
			`DROP INDEX "IDX_96cca3cd3a2b15b1f20e5333c9"`,
			undefined
		);
		await queryRunner.query(`DROP TABLE "measurement_rollup"`, undefined);
		await queryRunner.query(
			`DROP INDEX "IDX_f29698257a330e17d2260b84b5"`,
			undefined
		);
		await queryRunner.query(`DROP TABLE "crawl_v2"`, undefined);
	}
}
