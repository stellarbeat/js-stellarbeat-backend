import { MigrationInterface, QueryRunner } from 'typeorm';

export class organizations1559975071741 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`CREATE TABLE "organization" ("id" SERIAL NOT NULL, "organizationJson" jsonb NOT NULL, "crawlId" integer, CONSTRAINT "PK_472c1f99a32def1b0abb219cd67" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`ALTER TABLE "organization" ADD CONSTRAINT "FK_7b1195f9c1578dd93507b299a85" FOREIGN KEY ("crawlId") REFERENCES "crawl"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`ALTER TABLE "organization" DROP CONSTRAINT "FK_7b1195f9c1578dd93507b299a85"`
		);
		await queryRunner.query(`DROP TABLE "organization"`);
	}
}
