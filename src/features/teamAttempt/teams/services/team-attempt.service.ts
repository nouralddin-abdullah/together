import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TeamAttempt } from '../entities/team-attempt.entity';
import { DailyProgress } from '../entities/daily-progress.entity';
import { SlipReport } from '../entities/slip-report.entity';
import { AttemptEndReason } from '@shared/types';

@Injectable()
export class TeamAttemptService {
  constructor(
    @InjectRepository(TeamAttempt)
    private readonly teamAttemptRepository: Repository<TeamAttempt>,
    @InjectRepository(DailyProgress)
    private readonly dailyProgressRepository: Repository<DailyProgress>,
    @InjectRepository(SlipReport)
    private readonly slipReportRepository: Repository<SlipReport>,
  ) {}

  /**
   * Create a new attempt for a team (called when challenge starts or resets)
   */
  async createAttempt(
    teamId: string,
    attemptNumber: number,
  ): Promise<TeamAttempt> {
    const attempt = this.teamAttemptRepository.create({
      teamId,
      attemptNumber,
      startedAt: new Date(),
      daysReached: 0,
      endReason: AttemptEndReason.ONGOING,
    });
    return this.teamAttemptRepository.save(attempt);
  }

  /**
   * Get the current ongoing attempt for a team
   */
  async getCurrentAttempt(teamId: string): Promise<TeamAttempt | null> {
    return this.teamAttemptRepository.findOne({
      where: { teamId, endReason: AttemptEndReason.ONGOING },
      order: { attemptNumber: 'DESC' },
    });
  }

  /**
   * Get all attempts for a team
   */
  async getTeamAttempts(teamId: string): Promise<TeamAttempt[]> {
    return this.teamAttemptRepository.find({
      where: { teamId },
      order: { attemptNumber: 'ASC' },
    });
  }

  /**
   * End an attempt (failed or completed)
   */
  async endAttempt(
    attemptId: string,
    endReason: AttemptEndReason,
    daysReached: number,
    failedByUserId?: string,
    wasAnonymous?: boolean,
  ): Promise<TeamAttempt> {
    await this.teamAttemptRepository.update(attemptId, {
      endedAt: new Date(),
      endReason,
      daysReached,
      failedByUserId: failedByUserId ?? null,
      wasAnonymous: wasAnonymous ?? false,
    });
    return this.teamAttemptRepository.findOneOrFail({
      where: { id: attemptId },
    });
  }

  /**
   * Create daily progress records for all team members (BUILD habits)
   */
  async createDailyProgressForMembers(
    teamId: string,
    attemptId: string,
    userIds: string[],
    date: string,
  ): Promise<DailyProgress[]> {
    const records = userIds.map((userId) =>
      this.dailyProgressRepository.create({
        teamId,
        attemptId,
        userId,
        date,
        completed: false,
      }),
    );
    return this.dailyProgressRepository.save(records);
  }

  /**
   * Mark a user's daily progress as completed
   */
  async markDailyProgressComplete(
    teamId: string,
    userId: string,
    date: string,
    proofUrl?: string,
    proofType?: 'image' | 'video',
  ): Promise<DailyProgress> {
    const progress = await this.dailyProgressRepository.findOne({
      where: { teamId, userId, date },
    });

    if (progress) {
      progress.completed = true;
      progress.completedAt = new Date();
      if (proofUrl) {
        progress.proofUrl = proofUrl;
        progress.proofType = proofType ?? null;
      }
      return this.dailyProgressRepository.save(progress);
    }

    // Create new if doesn't exist
    const newProgress = this.dailyProgressRepository.create({
      teamId,
      userId,
      date,
      completed: true,
      completedAt: new Date(),
      proofUrl: proofUrl ?? null,
      proofType: proofType ?? null,
    });
    return this.dailyProgressRepository.save(newProgress);
  }

  /**
   * Get daily progress for a team on a specific date
   */
  async getDailyProgress(
    teamId: string,
    date: string,
  ): Promise<DailyProgress[]> {
    return this.dailyProgressRepository.find({
      where: { teamId, date },
      relations: ['user'],
    });
  }

  /**
   * Create a slip report (QUIT habits)
   */
  async createSlipReport(
    teamId: string,
    userId: string,
    attemptId: string,
    anonymous: boolean,
    note?: string,
  ): Promise<SlipReport> {
    const report = this.slipReportRepository.create({
      teamId,
      userId,
      attemptId,
      reportedAt: new Date(),
      reportedAnonymously: anonymous,
      note: note ?? null,
    });
    return this.slipReportRepository.save(report);
  }

  /**
   * Get slip reports for a team
   */
  async getSlipReports(teamId: string): Promise<SlipReport[]> {
    return this.slipReportRepository.find({
      where: { teamId },
      relations: ['user'],
      order: { reportedAt: 'DESC' },
    });
  }
}
