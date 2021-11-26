import { MigrationInterface, QueryRunner } from 'typeorm';

export class subscriptionDates1637591171862 implements MigrationInterface {
	name = 'subscriptionDates1637591171862';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "subscription" ADD "subscriptionDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT '"2021-11-22T14:26:12.325Z"'`
		);
		await queryRunner.query(
			`ALTER TABLE "subscription_subscriber" ADD "registrationDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT '"2021-11-22T14:26:12.325Z"'`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "subscription_subscriber" DROP COLUMN "registrationDate"`
		);
		await queryRunner.query(
			`ALTER TABLE "subscription" DROP COLUMN "subscriptionDate"`
		);
	}
}
