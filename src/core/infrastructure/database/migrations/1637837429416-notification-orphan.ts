import { MigrationInterface, QueryRunner } from 'typeorm';

export class notificationOrphan1637837429416 implements MigrationInterface {
	name = 'notificationOrphan1637837429416';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "subscription_event_notification_state" DROP CONSTRAINT "FK_ab0ba6414394953ceda810c1001"`
		);
		await queryRunner.query(
			`ALTER TABLE "subscription_event_notification_state" ADD CONSTRAINT "FK_ab0ba6414394953ceda810c1001" FOREIGN KEY ("eventSubscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "subscription_event_notification_state" DROP CONSTRAINT "FK_ab0ba6414394953ceda810c1001"`
		);
		await queryRunner.query(
			`ALTER TABLE "subscription_event_notification_state" ADD CONSTRAINT "FK_ab0ba6414394953ceda810c1001" FOREIGN KEY ("eventSubscriptionId") REFERENCES "subscription"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}
}
