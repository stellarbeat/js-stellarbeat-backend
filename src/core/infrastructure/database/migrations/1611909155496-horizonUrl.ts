import { MigrationInterface, QueryRunner } from 'typeorm';

export class horizonUrl1611909155496 implements MigrationInterface {
	name = 'horizonUrl1611909155496';

	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot" ADD "horizonUrl" text`,
			undefined
		);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot" DROP COLUMN "horizonUrl"`,
			undefined
		);
	}
}
