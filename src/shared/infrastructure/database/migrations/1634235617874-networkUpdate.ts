import { MigrationInterface, QueryRunner } from 'typeorm';

export class networkUpdate1634235617874 implements MigrationInterface {
	name = 'networkUpdate1634235617874';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`alter table crawl_v2 rename to network_update`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`alter table network_update rename to crawl_v2`);
	}
}
