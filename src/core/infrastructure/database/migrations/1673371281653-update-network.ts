import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateNetwork1673371281653 implements MigrationInterface {
	name = 'updateNetwork1673371281653';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "configurationLedgerversion"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "configurationOverlayminversion"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "configurationOverlayversion"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "configurationVersionstring"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "configurationQuorumset"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "configurationQuorumsethash"`
		);
		await queryRunner.query(`ALTER TABLE "network" DROP COLUMN "name"`);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "name" text NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "maxLedgerVersion" smallint NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "quorumSet" jsonb NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "quorumSetConfigurationHash" character varying(64) NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "overlayVersionRangeMin" smallint NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "overlayVersionRangeMax" smallint NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "stellarCoreVersionValue" character varying NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_change" ADD "time" TIMESTAMP WITH TIME ZONE NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_change" ADD "networkIdValue" character varying`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_c24068b8094a20a9a4c8a0f7ff" ON "network_change" ("networkIdValue") `
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "network_change" DROP COLUMN "networkIdValue"`
		);
		await queryRunner.query(`ALTER TABLE "network_change" DROP COLUMN "time"`);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "stellarCoreVersionValue"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "overlayVersionRangeMax"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "overlayVersionRangeMin"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "quorumSetConfigurationHash"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "quorumSet"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "maxLedgerVersion"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "name"`
		);
		await queryRunner.query(`ALTER TABLE "network" ADD "name" text NOT NULL`);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "configurationQuorumsethash" character varying(64) NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "configurationQuorumset" jsonb NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "configurationVersionstring" character varying NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "configurationOverlayversion" smallint NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "configurationOverlayminversion" smallint NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "configurationLedgerversion" smallint NOT NULL`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_ad5b60bd93fc753f5a5b12bc6f" ON "network_change" ("type") `
		);
	}
}
