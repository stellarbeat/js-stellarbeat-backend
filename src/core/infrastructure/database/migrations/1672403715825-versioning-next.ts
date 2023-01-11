import { MigrationInterface, QueryRunner } from 'typeorm';

export class versioningNext1672403715825 implements MigrationInterface {
	name = 'versioningNext1672403715825';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS crawl cascade;`);
		await queryRunner.query(`DROP TABLE IF EXISTS node cascade;`);
		await queryRunner.query(`DROP TABLE IF EXISTS organization cascade;`);

		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_55488aaed4d63c35220746e9fb" ON "node_public_key" ("publicKeyValue") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_f0378faa8fd3955a3c39b2e711" ON "node_snap_shot" ("NodeId") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_b364c3a533568016045989c681" ON "organization_snap_shot" ("OrganizationId") `
		);
		await queryRunner.query(
			`ALTER TABLE "node_public_key" 
                RENAME TO "node"`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_id" 
                RENAME TO "organization"`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
