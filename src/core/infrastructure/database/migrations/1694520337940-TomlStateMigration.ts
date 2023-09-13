import { MigrationInterface, QueryRunner } from 'typeorm';

export class TomlStateMigration1694520337940 implements MigrationInterface {
	name = 'TomlStateMigration1694520337940';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "public"."organization_measurement_tomlstate_enum" AS ENUM('Unknown', 'Ok', 'RequestTimeout', 'DNSLookupFailed', 'HostnameResolutionFailed', 'ConnectionTimeout', 'ConnectionRefused', 'ConnectionResetByPeer', 'SocketClosedPrematurely', 'SocketTimeout', 'HostUnreachable', 'NotFound', 'ParsingError', 'Forbidden', 'ServerError', 'UnsupportedVersion', 'UnspecifiedError', 'ValidatorNotSEP20Linked', 'EmptyValidatorsField')`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_measurement" ADD "tomlState" "public"."organization_measurement_tomlstate_enum" NOT NULL DEFAULT 'Unknown'`
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
