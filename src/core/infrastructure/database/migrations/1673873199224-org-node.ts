import { MigrationInterface, QueryRunner } from 'typeorm';

export class orgNode1673873199224 implements MigrationInterface {
	name = 'orgNode1673873199224';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot"
                DROP CONSTRAINT "FK_1d5b50a64289602e18f2e284d10"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot"
                DROP COLUMN "OrganizationId"`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot"
                ADD "validators" json`
		);
		await queryRunner.query(
			`update organization_snap_shot ost
             set "validators" = (select json_agg("publicKey") publicKeys
                                 from (select json_object_agg('value', "publicKeyValue") as "publicKey",
                                              "organizationSnapShotId"
                                       from organization_snap_shot_validators_node_public_key
                                                join node n
                                                     on organization_snap_shot_validators_node_public_key."nodeId" = n.id
                                       where "organizationSnapShotId" = ost."id"
                                       group by "organizationSnapShotId", "publicKeyValue") as alias
                                 group by alias."organizationSnapShotId")`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot"
                DROP CONSTRAINT "FK_5e17a7d53b413679fce161bf0cf"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot"
                ALTER COLUMN "networkId" SET NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_change"
                DROP CONSTRAINT "FK_c8717aafb298a8f4875f2f1211c"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_change"
                ALTER COLUMN "networkId" SET NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot"
                ADD CONSTRAINT "FK_5e17a7d53b413679fce161bf0cf" FOREIGN KEY ("networkId") REFERENCES "network" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "network_change"
                ADD CONSTRAINT "FK_c8717aafb298a8f4875f2f1211c" FOREIGN KEY ("networkId") REFERENCES "network" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
