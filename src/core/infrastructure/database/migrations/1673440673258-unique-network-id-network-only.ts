import { MigrationInterface, QueryRunner } from 'typeorm';

export class uniqueNetworkIdNetworkOnly1673440673258
	implements MigrationInterface
{
	name = 'uniqueNetworkIdNetworkOnly1673440673258';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "network_change" DROP CONSTRAINT "UQ_c24068b8094a20a9a4c8a0f7ff0"`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
