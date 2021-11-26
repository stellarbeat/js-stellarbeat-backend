import { MigrationInterface, QueryRunner } from 'typeorm';

export class networkRollups1599197183425 implements MigrationInterface {
	name = 'networkRollups1599197183425';

	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "topTierSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "topTierFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "topTierOrgsSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "topTierOrgsFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetOrgsSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minBlockingSetOrgsFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_day" ADD "minSplittingSetOrgsFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "topTierSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "topTierFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "topTierOrgsSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "topTierOrgsFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetOrgsSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minBlockingSetOrgsFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetOrgsSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "minSplittingSetOrgsFilteredSum" integer NOT NULL DEFAULT 0`,
			undefined
		);
		await queryRunner.query(
			`ALTER TABLE "network_measurement_month" ADD "hasTransitiveQuorumSetCount" smallint NOT NULL DEFAULT 0`,
			undefined
		);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {}
}
