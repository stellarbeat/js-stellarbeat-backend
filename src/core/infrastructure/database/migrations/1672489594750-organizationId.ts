import { MigrationInterface, QueryRunner } from 'typeorm';

export class organizationId1672489594750 implements MigrationInterface {
	name = 'organizationId1672489594750';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "organization" RENAME COLUMN "organizationId" TO "organizationIdValue"`
		);
		await queryRunner.query(
			`ALTER TABLE "organization" alter column "organizationIdValue" type varchar(100) using "organizationIdValue"::varchar(100);`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
