import { MigrationInterface, QueryRunner } from 'typeorm';

export class nodeScan1674560008886 implements MigrationInterface {
	name = 'nodeScan1674560008886';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "node_snap_shot"
            ADD "isp" text`);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot"
                ADD "homeDomain" text`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot"
                ADD "ledgerVersion" integer`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot"
                ADD "overlayVersion" integer`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot"
                ADD "overlayMinVersion" integer`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot"
                ADD "versionStr" text`
		);

		await queryRunner.query(`update node_snap_shot as "nss"
                                 set "versionStr"        = (select "node_details"."versionStr"
                                                                from "node_details"
                                                                where "node_details"."id" = "nss"."NodeDetailsId"),
                                     "overlayVersion"    = (select "node_details"."overlayVersion"
                                                                from "node_details"
                                                                where "node_details"."id" = "nss"."NodeDetailsId"),
                                     "overlayMinVersion" = (select "node_details"."overlayMinVersion"
                                                                from "node_details"
                                                                where "node_details"."id" = "nss"."NodeDetailsId"),
                                     "ledgerVersion"     = (select "node_details"."ledgerVersion"
                                                                from "node_details"
                                                                where "node_details"."id" = "nss"."NodeDetailsId"),
                                     "homeDomain"        = (select "node_details"."homeDomain"
                                                                from "node_details"
                                                                where "node_details"."id" = "nss"."NodeDetailsId"),
                                     "isp"               = (select "node_details"."isp"
                                                                from "node_details"
                                                                where "node_details"."id" = "nss"."NodeDetailsId")
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot"
                DROP COLUMN "versionStr"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot"
                DROP COLUMN "overlayMinVersion"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot"
                DROP COLUMN "overlayVersion"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot"
                DROP COLUMN "ledgerVersion"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot"
                DROP COLUMN "homeDomain"`
		);
		await queryRunner.query(`ALTER TABLE "node_snap_shot"
            DROP COLUMN "isp"`);
	}
}
