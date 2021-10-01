import { MigrationInterface, QueryRunner } from 'typeorm';

export class nodeMeasurementDay1570858454796 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`CREATE TABLE "node_measurement_day" ("day" TIMESTAMP WITH TIME ZONE NOT NULL, "publicKey" character varying(56) NOT NULL, "isValidatingCount" smallint NOT NULL DEFAULT 0, "crawlCount" smallint NOT NULL DEFAULT 0, CONSTRAINT "PK_d537bd784ab5ea9018ca4dd875b" PRIMARY KEY ("day", "publicKey"))`
		);
		await queryRunner.query(
			`CREATE TABLE "node_measurement_rollup" ("id" SERIAL NOT NULL, "name" text NOT NULL, "targetTableName" text NOT NULL, "lastAggregatedCrawlId" bigint NOT NULL DEFAULT 0, CONSTRAINT "PK_4844ecff086d1668c0b9e83481e" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_3dd876491656525eed6553f3d6" ON "node_measurement_rollup" ("name") `
		);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`DROP INDEX "IDX_3dd876491656525eed6553f3d6"`);
		await queryRunner.query(`DROP TABLE "node_measurement_rollup"`);
		await queryRunner.query(`DROP TABLE "node_measurement_day"`);
	}
}
