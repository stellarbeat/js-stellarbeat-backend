import { MigrationInterface, QueryRunner } from 'typeorm';

export class TomlStateMigration1694520337940 implements MigrationInterface {
	name = 'TomlStateMigration1694520337940';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "public"."organization_measurement_tomlstate_enum" AS ENUM('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18')`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_measurement" ADD "tomlState" "public"."organization_measurement_tomlstate_enum" NOT NULL DEFAULT '0'`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "organization_measurement" DROP COLUMN "tomlState"`
		);
		await queryRunner.query(
			`DROP TYPE "public"."organization_measurement_tomlstate_enum"`
		);
	}
}
