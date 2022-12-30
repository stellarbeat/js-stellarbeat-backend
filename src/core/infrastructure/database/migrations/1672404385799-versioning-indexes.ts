import { MigrationInterface, QueryRunner } from 'typeorm';

export class versioningTest1672404385799 implements MigrationInterface {
	name = 'versioningTest1672404385799';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot_validators_node_public_key" DROP CONSTRAINT "FK_e798d857886c247f2389af213af"`
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_a62f50a71c4dd451e5e149f176"`
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_55488aaed4d63c35220746e9fb"`
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_e798d857886c247f2389af213a"`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot_validators_node_public_key" RENAME COLUMN "nodePublicKeyId" TO "nodeId"`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot_validators_node_public_key" RENAME CONSTRAINT "PK_9d34cde6ac5c6ec5d586f3dca3d" TO "PK_b7978a0a7f436bfa8683e0d72aa"`
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_7867970695572b3f6561516414" ON "organization" ("organizationId") `
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_aeb31719c1b3f83fa87fdde03a" ON "node" ("publicKeyValue") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_097b699bd5c26a84d983a0564c" ON "organization_snap_shot_validators_node_public_key" ("nodeId") `
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot_validators_node_public_key" ADD CONSTRAINT "FK_097b699bd5c26a84d983a0564c8" FOREIGN KEY ("nodeId") REFERENCES "node"("id") ON DELETE CASCADE ON UPDATE CASCADE`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
