import { MigrationInterface, QueryRunner } from 'typeorm';

export class test1654680277045 implements MigrationInterface {
	name = 'test1654680277045';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TYPE "public"."subscription_event_notification_state_eventtype_enum" RENAME TO "subscription_event_notification_state_eventtype_enum_old"`
		);
		await queryRunner.query(
			`CREATE TYPE "public"."subscription_event_notification_state_eventtype_enum" AS ENUM('NodeXUpdatesInactive', 'ValidatorXUpdatesNotValidating', 'ValidatorLivenessRisk', 'FullValidatorXUpdatesHistoryArchiveOutOfDate', 'HistoryArchiveGapDetected', 'OrganizationXUpdatesUnavailable', 'NetworkTransitiveQuorumSetChanged', 'NetworkNodeLivenessRisk', 'NetworkNodeSafetyRisk', 'NetworkOrganizationLivenessRisk', 'NetworkOrganizationSafetyRisk', 'NetworkLossOfLiveness', 'NetworkLossOfSafety')`
		);
		await queryRunner.query(
			`ALTER TABLE "subscription_event_notification_state" ALTER COLUMN "eventType" TYPE "public"."subscription_event_notification_state_eventtype_enum" USING "eventType"::"text"::"public"."subscription_event_notification_state_eventtype_enum"`
		);
		await queryRunner.query(
			`DROP TYPE "public"."subscription_event_notification_state_eventtype_enum_old"`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "public"."subscription_event_notification_state_eventtype_enum_old" AS ENUM('NodeXUpdatesInactive', 'ValidatorXUpdatesNotValidating', 'ValidatorLivenessRisk', 'FullValidatorXUpdatesHistoryArchiveOutOfDate', 'OrganizationXUpdatesUnavailable', 'NetworkTransitiveQuorumSetChanged', 'NetworkNodeLivenessRisk', 'NetworkNodeSafetyRisk', 'NetworkOrganizationLivenessRisk', 'NetworkOrganizationSafetyRisk', 'NetworkLossOfLiveness', 'NetworkLossOfSafety')`
		);
		await queryRunner.query(
			`ALTER TABLE "subscription_event_notification_state" ALTER COLUMN "eventType" TYPE "public"."subscription_event_notification_state_eventtype_enum_old" USING "eventType"::"text"::"public"."subscription_event_notification_state_eventtype_enum_old"`
		);
		await queryRunner.query(
			`DROP TYPE "public"."subscription_event_notification_state_eventtype_enum"`
		);
		await queryRunner.query(
			`ALTER TYPE "public"."subscription_event_notification_state_eventtype_enum_old" RENAME TO "subscription_event_notification_state_eventtype_enum"`
		);
	}
}
