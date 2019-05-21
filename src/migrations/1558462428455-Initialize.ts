import {MigrationInterface, QueryRunner} from "typeorm";

export class Initialize1558462428455 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "node_statistic" ("time" TIMESTAMP WITH TIME ZONE NOT NULL, "publicKey" character varying NOT NULL, "isActive" boolean NOT NULL, "isValidating" boolean NOT NULL, "isOverloaded" boolean NOT NULL, CONSTRAINT "PK_91ce1a2e6db40dd397c3d21edef" PRIMARY KEY ("time"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE "node_statistic"`);
    }

}
