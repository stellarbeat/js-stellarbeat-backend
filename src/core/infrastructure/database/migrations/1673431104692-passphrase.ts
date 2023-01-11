import { MigrationInterface, QueryRunner } from 'typeorm';

export class passphrase1673431104692 implements MigrationInterface {
	name = 'passphrase1673431104692';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "network" ADD "passphrase" text NOT NULL`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "network" DROP COLUMN "passphrase"`);
	}
}
