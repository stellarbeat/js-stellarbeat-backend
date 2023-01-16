import { MigrationInterface, QueryRunner } from 'typeorm';

export class lastIpChange1673898386176 implements MigrationInterface {
	name = 'lastIpChange1673898386176';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" DROP COLUMN "ipChange"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" ADD "lastIpChange" TIMESTAMP WITH TIME ZONE default NULL`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
