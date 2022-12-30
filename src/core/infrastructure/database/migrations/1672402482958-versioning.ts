import { MigrationInterface, QueryRunner } from 'typeorm';

export class versioning1672402482958 implements MigrationInterface {
	name = 'versioning1672402482958';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot" DROP CONSTRAINT "FK_85f2fc256de520c118cd539cdf9"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_day_v2" DROP CONSTRAINT "FK_4aafe1b135546cb3a6bafe51c2f"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" DROP CONSTRAINT "FK_060186c5bac61307360d14b201d"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" DROP CONSTRAINT "FK_00e668c81310ea1ec6e54d92b8c"`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_measurement_day" DROP CONSTRAINT "FK_4c64920c7b202687cab393cb613"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" DROP CONSTRAINT "FK_503a29201385047923730812d35"`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_measurement" DROP CONSTRAINT "FK_0a1c396753b5179c5c238ca601b"`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot_validators_node_public_key" DROP CONSTRAINT "FK_e798d857886c247f2389af213af"`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot_validators_node_public_key" DROP CONSTRAINT "FK_37d4aa0a922a70253a8c2eb81ca"`
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_f29698257a330e17d2260b84b5"`
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_cdbf727581401eb4fbe27af1f4"`
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_85f2fc256de520c118cd539cdf"`
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_060186c5bac61307360d14b201"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_public_key" RENAME COLUMN "publicKey" TO "publicKeyValue"`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot" RENAME COLUMN "OrganizationIdStorageId" TO "OrganizationId"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_day_v2" RENAME COLUMN "nodePublicKeyStorageId" TO "nodeId"`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_measurement_day" RENAME COLUMN "organizationIdStorageId" TO "organizationId"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" RENAME COLUMN "nodePublicKeyStorageId" TO "nodeId"`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_measurement" RENAME COLUMN "organizationIdStorageId" TO "organizationId"`
		);
		await queryRunner.query(
			`CREATE TABLE "network_snapshot" ("id" SERIAL NOT NULL, "startDate" TIMESTAMP WITH TIME ZONE NOT NULL, "endDate" TIMESTAMP WITH TIME ZONE NOT NULL, "networkId" integer, "configurationLedgerversion" smallint NOT NULL, "configurationOverlayminversion" smallint NOT NULL, "configurationOverlayversion" smallint NOT NULL, "configurationVersionstring" character varying NOT NULL, CONSTRAINT "PK_4140a1a18a4baf8d48aa5d10a2b" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_c7c47f42ed86f558d8889aaeff" ON "network_snapshot" ("startDate") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_5890cf5124db3a2da5a00c73ed" ON "network_snapshot" ("endDate") `
		);
		await queryRunner.query(
			`CREATE TABLE "network" ("id" SERIAL NOT NULL, "name" text NOT NULL, "networkIdValue" character varying NOT NULL, CONSTRAINT "PK_8f8264c2d37cbbd8282ee9a3c97" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_a6427dcac5713566cbf8b7b016" ON "network" ("networkIdValue") `
		);
		await queryRunner.query(
			`CREATE TABLE "network_change" ("id" SERIAL NOT NULL, "from" jsonb NOT NULL, "to" jsonb NOT NULL, "type" character varying NOT NULL, "networkId" integer, CONSTRAINT "PK_5f300545fd8c158bce9ce4cb0ac" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_ad5b60bd93fc753f5a5b12bc6f" ON "network_change" ("type") `
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" rename COLUMN "NodePublicKeyId" to "NodeId"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" rename COLUMN "OrganizationIdStorageId" to "OrganizationId"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD CONSTRAINT "FK_5e17a7d53b413679fce161bf0cf" FOREIGN KEY ("networkId") REFERENCES "network"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "network_change" ADD CONSTRAINT "FK_c8717aafb298a8f4875f2f1211c" FOREIGN KEY ("networkId") REFERENCES "network"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot" ADD CONSTRAINT "FK_b364c3a533568016045989c6815" FOREIGN KEY ("OrganizationId") REFERENCES "organization_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_day_v2" ADD CONSTRAINT "FK_0aacace9c8c171ad97227b99414" FOREIGN KEY ("nodeId") REFERENCES "node_public_key"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" ADD CONSTRAINT "FK_f0378faa8fd3955a3c39b2e7119" FOREIGN KEY ("NodeId") REFERENCES "node_public_key"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" ADD CONSTRAINT "FK_1d5b50a64289602e18f2e284d10" FOREIGN KEY ("OrganizationId") REFERENCES "organization_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_measurement_day" ADD CONSTRAINT "FK_44d68724a423df521e9cb275cbd" FOREIGN KEY ("organizationId") REFERENCES "organization_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" ADD CONSTRAINT "FK_7d64e13382bb4c760b4f0eb8c05" FOREIGN KEY ("nodeId") REFERENCES "node_public_key"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_measurement" ADD CONSTRAINT "FK_3a6eb9bd56be70c88001f4c632f" FOREIGN KEY ("organizationId") REFERENCES "organization_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot_validators_node_public_key" ADD CONSTRAINT "FK_37d4aa0a922a70253a8c2eb81ca" FOREIGN KEY ("organizationSnapShotId") REFERENCES "organization_snap_shot"("id") ON DELETE CASCADE ON UPDATE CASCADE`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot_validators_node_public_key" ADD CONSTRAINT "FK_e798d857886c247f2389af213af" FOREIGN KEY ("nodePublicKeyId") REFERENCES "node_public_key"("id") ON DELETE CASCADE ON UPDATE CASCADE`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
