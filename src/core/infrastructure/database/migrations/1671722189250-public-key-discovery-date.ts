import { MigrationInterface, QueryRunner } from 'typeorm';

export class publicKeyDiscoveryDate1671722189250 implements MigrationInterface {
	name = 'publicKeyDiscoveryDate1671722189250';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "network_change"
             (
                 "id"        SERIAL            NOT NULL,
                 "from"      jsonb             NOT NULL,
                 "to"        jsonb             NOT NULL,
                 "type"      character varying NOT NULL,
                 "networkId" integer,
                 CONSTRAINT "PK_5f300545fd8c158bce9ce4cb0ac" PRIMARY KEY ("id")
             )`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_ad5b60bd93fc753f5a5b12bc6f" ON "network_change" ("type") `
		);
		await queryRunner.query(
			`CREATE TABLE "network"
             (
                 "id"                             SERIAL                   NOT NULL,
                 "startDate"                      TIMESTAMP WITH TIME ZONE NOT NULL,
                 "endDate"                        TIMESTAMP WITH TIME ZONE NOT NULL,
                 "ConfigurationLedgerversion"     smallint                 NOT NULL,
                 "ConfigurationOverlayminversion" smallint                 NOT NULL,
                 "ConfigurationOverlayversion"    smallint                 NOT NULL,
                 "ConfigurationVersionstring"     character varying        NOT NULL,
                 "networkIdId"                    SERIAL                   NOT NULL,
                 "networkIdNetworkid"             character varying        NOT NULL,
                 CONSTRAINT "PK_1fcec4c8a7ee9a9b99c37e4b85c" PRIMARY KEY ("id", "networkIdId")
             )`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_0e16b1c7dd3e18eaa25511caa8" ON "network" ("startDate") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_e2077c9d6ae8d582caf726e1de" ON "network" ("endDate") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_a922146efc411d8ecae85da38c" ON "network" ("networkIdNetworkid") `
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot"
                ADD "discoveryDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
		);
		await queryRunner.query(`update node_snap_shot as nss
                                 set "discoveryDate" = (select "dateDiscovered"
                                                        from node_public_key npk
                                                        where npk.id = nss."NodePublicKeyId")`);
		await queryRunner.query(
			`ALTER TABLE "node_public_key"
                DROP COLUMN "dateDiscovered"`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_1cb7d16679c739ceaaf949d547" ON "node_snap_shot" ("discoveryDate") `
		);
		await queryRunner.query(
			`ALTER TABLE "network_change"
                ADD CONSTRAINT "FK_ed0e5588d8a8b507d8d79b3dc3b" FOREIGN KEY ("networkId", "networkId") REFERENCES "network" ("id", "networkIdId") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
