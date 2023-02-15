import { MigrationInterface, QueryRunner } from 'typeorm';

export class uniqueSnapshot1676455964296 implements MigrationInterface {
	name = 'uniqueSnapshot1676455964296';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" ADD CONSTRAINT "UQ_7605722a94e2466c5a09befcc92" UNIQUE ("endDate", "NodeId")`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot" ADD CONSTRAINT "UQ_d01538994ff9142e405e0e95673" UNIQUE ("endDate", "OrganizationId")`
		);
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" ADD CONSTRAINT "UQ_95bf848e98b452983af7dfed0fb" UNIQUE ("endDate", "networkId")`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "network_snapshot" DROP CONSTRAINT "UQ_95bf848e98b452983af7dfed0fb"`
		);
		await queryRunner.query(
			`ALTER TABLE "organization_snap_shot" DROP CONSTRAINT "UQ_d01538994ff9142e405e0e95673"`
		);
		await queryRunner.query(
			`ALTER TABLE "node_snap_shot" DROP CONSTRAINT "UQ_7605722a94e2466c5a09befcc92"`
		);
	}
}
