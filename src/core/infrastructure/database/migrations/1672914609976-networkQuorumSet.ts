import { MigrationInterface, QueryRunner } from 'typeorm';

export class networkQuorumSet1672914609976 implements MigrationInterface {
	name = 'networkQuorumSet1672914609976';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "configurationQuorumset" jsonb NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD "configurationQuorumsethash" character varying(64) NOT NULL`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "configurationQuorumsethash"`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP COLUMN "configurationQuorumset"`
		);
	}
}
