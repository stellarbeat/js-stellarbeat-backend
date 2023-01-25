import { MigrationInterface, QueryRunner } from 'typeorm';

export class homeDomain1674643629973 implements MigrationInterface {
	name = 'homeDomain1674643629973';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "organization" ALTER COLUMN "homeDomain" SET NOT NULL`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "organization" ALTER COLUMN "homeDomain" DROP NOT NULL`
		);
	}
}
