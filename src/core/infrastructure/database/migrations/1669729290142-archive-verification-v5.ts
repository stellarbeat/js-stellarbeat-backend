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
		await queryRunner.query(
			`CREATE TYPE "public"."history_archive_scan_error_type_enum" AS ENUM('0', '1')`
		);
		await queryRunner.query(
			`CREATE TABLE "history_archive_scan_error" ("id" SERIAL NOT NULL, "type" "public"."history_archive_scan_error_type_enum" NOT NULL, "url" text NOT NULL, "message" text NOT NULL, CONSTRAINT "PK_f01db016af768a420eef0baf1b8" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" DROP COLUMN "errorType"`
		);
		await queryRunner.query(
			`DROP TYPE "public"."history_archive_scan_v2_errortype_enum"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" DROP COLUMN "errorUrl"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" DROP COLUMN "errorMessage"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ADD "errorId" integer`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ADD CONSTRAINT "UQ_46eec21600c888d33ee311b9fc7" UNIQUE ("errorId")`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ADD CONSTRAINT "FK_46eec21600c888d33ee311b9fc7" FOREIGN KEY ("errorId") REFERENCES "history_archive_scan_error"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" DROP CONSTRAINT "FK_46eec21600c888d33ee311b9fc7"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" DROP CONSTRAINT "UQ_46eec21600c888d33ee311b9fc7"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" DROP COLUMN "errorId"`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ADD "errorMessage" text`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ADD "errorUrl" text`
		);
		await queryRunner.query(
			`CREATE TYPE "public"."history_archive_scan_v2_errortype_enum" AS ENUM('0', '1')`
		);
		await queryRunner.query(
			`ALTER TABLE "history_archive_scan_v2" ADD "errorType" "public"."history_archive_scan_v2_errortype_enum"`
		);
		await queryRunner.query(`DROP TABLE "history_archive_scan_error"`);
		await queryRunner.query(
			`DROP TYPE "public"."history_archive_scan_error_type_enum"`
		);
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
