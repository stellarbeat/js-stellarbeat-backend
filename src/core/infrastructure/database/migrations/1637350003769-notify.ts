import { MigrationInterface, QueryRunner } from 'typeorm';

export class notify1637350003769 implements MigrationInterface {
	name = 'notify1637350003769';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "subscription_pending" ("id" SERIAL NOT NULL, "time" TIMESTAMP WITH TIME ZONE NOT NULL, "eventSourceIds" jsonb NOT NULL, "pendingSubscriptionIdValue" uuid NOT NULL, CONSTRAINT "PK_ae7d3a57ffd37e9bd4068ee7405" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE TYPE "public"."subscription_event_notification_state_eventtype_enum" AS ENUM('NodeXUpdatesInactive', 'ValidatorXUpdatesNotValidating', 'ValidatorLivenessRisk', 'FullValidatorXUpdatesHistoryArchiveOutOfDate', 'OrganizationXUpdatesUnavailable', 'NetworkTransitiveQuorumSetChanged', 'NetworkNodeLivenessRisk', 'NetworkNodeSafetyRisk', 'NetworkOrganizationLivenessRisk', 'NetworkOrganizationSafetyRisk', 'NetworkLossOfLiveness', 'NetworkLossOfSafety')`
		);
		await queryRunner.query(
			`CREATE TABLE "subscription_event_notification_state" ("id" SERIAL NOT NULL, "latestSendTime" TIMESTAMP WITH TIME ZONE NOT NULL, "eventType" "public"."subscription_event_notification_state_eventtype_enum" NOT NULL, "ignoreCoolOffPeriod" boolean NOT NULL DEFAULT false, "eventSubscriptionId" integer NOT NULL, CONSTRAINT "PK_605786a328fe440890932ed1543" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE TABLE "subscription" ("id" SERIAL NOT NULL, "eventSourceId" jsonb NOT NULL, "subscriberId" integer NOT NULL, CONSTRAINT "PK_8c3e00ebd02103caa1174cd5d9d" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE TABLE "subscription_subscriber" ("id" SERIAL NOT NULL, "pendingSubscriptionId" integer, "userIdValue" uuid NOT NULL, "subscriberReferenceValue" uuid NOT NULL, CONSTRAINT "REL_47f16a67cf176ab64b8665b261" UNIQUE ("pendingSubscriptionId"), CONSTRAINT "UQ_ccf1bcc4c827d76104f89b71bfd" UNIQUE ("userIdValue"), CONSTRAINT "PK_e86c94ef2066df53b34d1e5edec" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_ccf1bcc4c827d76104f89b71bf" ON "subscription_subscriber" ("userIdValue") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_2a66312cc6520f21ddccb51106" ON "subscription_subscriber" ("subscriberReferenceValue") `
		);
		await queryRunner.query(
			`ALTER TABLE "subscription_event_notification_state" ADD CONSTRAINT "FK_ab0ba6414394953ceda810c1001" FOREIGN KEY ("eventSubscriptionId") REFERENCES "subscription"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "subscription" ADD CONSTRAINT "FK_95a175097e883d7d1deb5780c62" FOREIGN KEY ("subscriberId") REFERENCES "subscription_subscriber"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "subscription_subscriber" ADD CONSTRAINT "FK_47f16a67cf176ab64b8665b2617" FOREIGN KEY ("pendingSubscriptionId") REFERENCES "subscription_pending"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "subscription_subscriber" DROP CONSTRAINT "FK_47f16a67cf176ab64b8665b2617"`
		);
		await queryRunner.query(
			`ALTER TABLE "subscription" DROP CONSTRAINT "FK_95a175097e883d7d1deb5780c62"`
		);
		await queryRunner.query(
			`ALTER TABLE "subscription_event_notification_state" DROP CONSTRAINT "FK_ab0ba6414394953ceda810c1001"`
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_2a66312cc6520f21ddccb51106"`
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_ccf1bcc4c827d76104f89b71bf"`
		);
		await queryRunner.query(`DROP TABLE "subscription_subscriber"`);
		await queryRunner.query(`DROP TABLE "subscription"`);
		await queryRunner.query(
			`DROP TABLE "subscription_event_notification_state"`
		);
		await queryRunner.query(
			`DROP TYPE "public"."subscription_event_notification_state_eventtype_enum"`
		);
		await queryRunner.query(`DROP TABLE "subscription_pending"`);
	}
}
