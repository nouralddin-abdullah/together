import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHabitStreakEntities1769008761703 implements MigrationInterface {
    name = 'AddHabitStreakEntities1769008761703'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "team_attempt" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "teamId" uuid NOT NULL, "attemptNumber" integer NOT NULL, "startedAt" TIMESTAMP NOT NULL, "endedAt" TIMESTAMP, "daysReached" integer NOT NULL DEFAULT '0', "endReason" character varying NOT NULL DEFAULT 'ongoing', "failedByUserId" uuid, "wasAnonymous" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bd95f33b252d3678ae6fc12efc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ee950b3417490952142b99d850" ON "team_attempt" ("teamId") `);
        await queryRunner.query(`CREATE TABLE "slip_report" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "teamId" uuid NOT NULL, "userId" uuid NOT NULL, "attemptId" uuid NOT NULL, "reportedAt" TIMESTAMP NOT NULL, "reportedAnonymously" boolean NOT NULL DEFAULT false, "note" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_73e6542b65ff53574486bb91838" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_87f7d2f500b1946a4e1f046e13" ON "slip_report" ("teamId") `);
        await queryRunner.query(`CREATE TABLE "daily_progress" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "teamId" uuid NOT NULL, "userId" uuid NOT NULL, "attemptId" uuid NOT NULL, "date" date NOT NULL, "completed" boolean NOT NULL DEFAULT false, "completedAt" TIMESTAMP, "proofUrl" character varying, "proofType" character varying, CONSTRAINT "PK_f0fbbbc35098c23afdfb5c2f436" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7ec6b5648c3959f5637566ff82" ON "daily_progress" ("teamId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4052816f90fa8972f8641b615c" ON "daily_progress" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f51c371dd9e980376e4cb1a41e" ON "daily_progress" ("teamId", "userId", "date") `);
        await queryRunner.query(`ALTER TABLE "team" ADD "requireProof" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "user" ADD "lastCheckInDate" date`);
        await queryRunner.query(`ALTER TABLE "team_attempt" ADD CONSTRAINT "FK_ee950b3417490952142b99d8501" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "slip_report" ADD CONSTRAINT "FK_87f7d2f500b1946a4e1f046e139" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "slip_report" ADD CONSTRAINT "FK_7dddcc027b949bc8ab3f25885cf" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "slip_report" ADD CONSTRAINT "FK_f7441ad32d4239b5bbc8a0773a9" FOREIGN KEY ("attemptId") REFERENCES "team_attempt"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "daily_progress" ADD CONSTRAINT "FK_7ec6b5648c3959f5637566ff821" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "daily_progress" ADD CONSTRAINT "FK_4052816f90fa8972f8641b615c1" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "daily_progress" ADD CONSTRAINT "FK_1dd1ced410ae87a35b71c1dec68" FOREIGN KEY ("attemptId") REFERENCES "team_attempt"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "daily_progress" DROP CONSTRAINT "FK_1dd1ced410ae87a35b71c1dec68"`);
        await queryRunner.query(`ALTER TABLE "daily_progress" DROP CONSTRAINT "FK_4052816f90fa8972f8641b615c1"`);
        await queryRunner.query(`ALTER TABLE "daily_progress" DROP CONSTRAINT "FK_7ec6b5648c3959f5637566ff821"`);
        await queryRunner.query(`ALTER TABLE "slip_report" DROP CONSTRAINT "FK_f7441ad32d4239b5bbc8a0773a9"`);
        await queryRunner.query(`ALTER TABLE "slip_report" DROP CONSTRAINT "FK_7dddcc027b949bc8ab3f25885cf"`);
        await queryRunner.query(`ALTER TABLE "slip_report" DROP CONSTRAINT "FK_87f7d2f500b1946a4e1f046e139"`);
        await queryRunner.query(`ALTER TABLE "team_attempt" DROP CONSTRAINT "FK_ee950b3417490952142b99d8501"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "lastCheckInDate"`);
        await queryRunner.query(`ALTER TABLE "team" DROP COLUMN "requireProof"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f51c371dd9e980376e4cb1a41e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4052816f90fa8972f8641b615c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7ec6b5648c3959f5637566ff82"`);
        await queryRunner.query(`DROP TABLE "daily_progress"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_87f7d2f500b1946a4e1f046e13"`);
        await queryRunner.query(`DROP TABLE "slip_report"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ee950b3417490952142b99d850"`);
        await queryRunner.query(`DROP TABLE "team_attempt"`);
    }

}
