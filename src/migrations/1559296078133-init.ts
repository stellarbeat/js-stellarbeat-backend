import { MigrationInterface, QueryRunner } from 'typeorm';

export class init1559296078133 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`CREATE TABLE "node" ("id" SERIAL NOT NULL, "nodeJson" jsonb NOT NULL, "crawlId" integer, CONSTRAINT "PK_8c8caf5f29d25264abe9eaf94dd" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE TABLE "crawl" ("id" SERIAL NOT NULL, "time" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_77a56a8a8369d0c36c60dbb3fdd" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_6786048278cbe280666c6586a0" ON "crawl" ("time") `
		);
		await queryRunner.query(
			`CREATE TABLE "node_measurement" ("id" SERIAL NOT NULL, "time" TIMESTAMP WITH TIME ZONE NOT NULL, "publicKey" character varying(56) NOT NULL, "isActive" boolean NOT NULL, "isValidating" boolean NOT NULL, "isOverLoaded" boolean NOT NULL, CONSTRAINT "PK_884ef70233e29472514dc5fffe7" PRIMARY KEY ("id", "time"))`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_3cd3cf0c6ec3a8cc62c0b1cdce" ON "node_measurement" ("time") `
		);
		await queryRunner.query(
			`ALTER TABLE "node" ADD CONSTRAINT "FK_f54faccf9c7f79fcb537b22dd2b" FOREIGN KEY ("crawlId") REFERENCES "crawl"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`ALTER TABLE "node" DROP CONSTRAINT "FK_f54faccf9c7f79fcb537b22dd2b"`
		);
		await queryRunner.query(`DROP INDEX "IDX_3cd3cf0c6ec3a8cc62c0b1cdce"`);
		await queryRunner.query(`DROP TABLE "node_measurement"`);
		await queryRunner.query(`DROP INDEX "IDX_6786048278cbe280666c6586a0"`);
		await queryRunner.query(`DROP TABLE "crawl"`);
		await queryRunner.query(`DROP TABLE "node"`);
	}
}
