import { MigrationInterface, QueryRunner } from 'typeorm';

export class archiveVerificationV51669729290142 implements MigrationInterface {
	name = 'archiveVerificationV51669729290142';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "node_measurement_day_v2" RENAME COLUMN "historyArchiveGapCount" TO "historyArchiveErrorCount"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" RENAME COLUMN "historyArchiveGap" TO "historyArchiveHasError"`
		);
		await queryRunner.query(
			`ALTER TYPE "public"."subscription_event_notification_state_eventtype_enum" RENAME TO "subscription_event_notification_state_eventtype_enum_old"`
		);
		await queryRunner.query(
			`CREATE TYPE "public"."subscription_event_notification_state_eventtype_enum" AS ENUM('NodeXUpdatesInactive', 'ValidatorXUpdatesNotValidating', 'ValidatorLivenessRisk', 'FullValidatorXUpdatesHistoryArchiveOutOfDate', 'HistoryArchiveErrorDetected', 'OrganizationXUpdatesUnavailable', 'NetworkTransitiveQuorumSetChanged', 'NetworkNodeLivenessRisk', 'NetworkNodeSafetyRisk', 'NetworkOrganizationLivenessRisk', 'NetworkOrganizationSafetyRisk', 'NetworkLossOfLiveness', 'NetworkLossOfSafety')`
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
			`CREATE TYPE "public"."subscription_event_notification_state_eventtype_enum_old" AS ENUM('NodeXUpdatesInactive', 'ValidatorXUpdatesNotValidating', 'ValidatorLivenessRisk', 'FullValidatorXUpdatesHistoryArchiveOutOfDate', 'HistoryArchiveGapDetected', 'OrganizationXUpdatesUnavailable', 'NetworkTransitiveQuorumSetChanged', 'NetworkNodeLivenessRisk', 'NetworkNodeSafetyRisk', 'NetworkOrganizationLivenessRisk', 'NetworkOrganizationSafetyRisk', 'NetworkLossOfLiveness', 'NetworkLossOfSafety')`
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
		await queryRunner.query(
			`ALTER TABLE "node_measurement_v2" RENAME COLUMN "historyArchiveHasError" TO "historyArchiveGap"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_measurement_day_v2" RENAME COLUMN "historyArchiveErrorCount" TO "historyArchiveGapCount"`
		);
	}
}
