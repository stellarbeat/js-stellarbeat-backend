import { MigrationInterface, QueryRunner } from 'typeorm';

export class nameNullable1674815649104 implements MigrationInterface {
	name = 'nameNullable1674815649104';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`update organization set "homeDomain" = "organizationIdValue"
								 where "homeDomain" is null`);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_b02d3175c52b687e002a4fb5f1" ON "organization" ("homeDomain") `
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot"
                ALTER COLUMN "name" DROP NOT NULL`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP INDEX "public"."IDX_b02d3175c52b687e002a4fb5f1"`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot"
                ALTER COLUMN "name" SET NOT NULL`
		);
	}
}
