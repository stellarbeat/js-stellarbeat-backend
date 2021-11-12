import { MigrationInterface, QueryRunner } from 'typeorm';

export class notifications1636719438997 implements MigrationInterface {
	name = 'notifications1636719438997';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "public"."contact_event_notification_state_eventtype_enum" AS ENUM('NodeXUpdatesInactive', 'ValidatorXUpdatesNotValidating', 'ValidatorLivenessRisk', 'FullValidatorXUpdatesHistoryArchiveOutOfDate', 'OrganizationXUpdatesUnavailable', 'NetworkTransitiveQuorumSetChanged', 'NetworkNodeLivenessRisk', 'NetworkNodeSafetyRisk', 'NetworkOrganizationLivenessRisk', 'NetworkOrganizationSafetyRisk', 'NetworkLossOfLiveness', 'NetworkLossOfSafety')`
		);
		await queryRunner.query(
			`CREATE TABLE "contact_event_notification_state" ("id" SERIAL NOT NULL, "latestSendTime" TIMESTAMP WITH TIME ZONE NOT NULL, "eventType" "public"."contact_event_notification_state_eventtype_enum" NOT NULL, "ignoreCoolOffPeriod" boolean NOT NULL DEFAULT false, "eventSubscriptionId" integer NOT NULL, CONSTRAINT "PK_3a38dfd345148f6ed0bb4811805" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE TABLE "contact_subscription" ("id" SERIAL NOT NULL, "eventSourceId" jsonb NOT NULL, "contactId" integer NOT NULL, CONSTRAINT "PK_07ebffd6fc442665e98b7c39e16" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE TABLE "contact_pending_subscription" ("id" SERIAL NOT NULL, "time" TIMESTAMP WITH TIME ZONE NOT NULL, "eventSourceIds" jsonb NOT NULL, "pendingSubscriptionIdValue" uuid NOT NULL, CONSTRAINT "PK_4b5ab8bfda8841ed3b697f3b8a0" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE TABLE "contact" ("id" SERIAL NOT NULL, "pendingSubscriptionId" integer, "contactIdValue" uuid NOT NULL, "publicReferenceValue" uuid NOT NULL, CONSTRAINT "REL_61c3b5e423c147c8749324200a" UNIQUE ("pendingSubscriptionId"), CONSTRAINT "PK_2cbbe00f59ab6b3bb5b8d19f989" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_d6c977d0908ee9ce5f9216e589" ON "contact" ("contactIdValue") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_c52b81a42db44fee8497e42391" ON "contact" ("publicReferenceValue") `
		);
		await queryRunner.query(
			`ALTER TABLE "contact_event_notification_state" ADD CONSTRAINT "FK_8b1641fdec93828a9fd1ebeba7e" FOREIGN KEY ("eventSubscriptionId") REFERENCES "contact_subscription"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "contact_subscription" ADD CONSTRAINT "FK_39b1afd3aee85f169823119ea0b" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "contact" ADD CONSTRAINT "FK_61c3b5e423c147c8749324200a1" FOREIGN KEY ("pendingSubscriptionId") REFERENCES "contact_pending_subscription"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "contact" DROP CONSTRAINT "FK_61c3b5e423c147c8749324200a1"`
		);
		await queryRunner.query(
			`ALTER TABLE "contact_subscription" DROP CONSTRAINT "FK_39b1afd3aee85f169823119ea0b"`
		);
		await queryRunner.query(
			`ALTER TABLE "contact_event_notification_state" DROP CONSTRAINT "FK_8b1641fdec93828a9fd1ebeba7e"`
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_c52b81a42db44fee8497e42391"`
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_d6c977d0908ee9ce5f9216e589"`
		);
		await queryRunner.query(`DROP TABLE "contact"`);
		await queryRunner.query(`DROP TABLE "contact_pending_subscription"`);
		await queryRunner.query(`DROP TABLE "contact_subscription"`);
		await queryRunner.query(`DROP TABLE "contact_event_notification_state"`);
		await queryRunner.query(
			`DROP TYPE "public"."contact_event_notification_state_eventtype_enum"`
		);
	}
}
