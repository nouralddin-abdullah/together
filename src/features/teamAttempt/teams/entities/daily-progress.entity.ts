import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Team } from '@features/teams';
import { User } from '@features/users/entities/user.entity';
import { TeamAttempt } from './team-attempt.entity';

/**
 * DailyProgress - Tracks daily check-ins for BUILD habits
 *
 * Each record represents one user's progress for one day.
 * Only used for BUILD habit types (not QUIT).
 */
@Entity()
@Index(['teamId', 'userId', 'date'], { unique: true })
export class DailyProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  attemptId: string;

  @Column({ type: 'date' })
  date: string; // 'YYYY-MM-DD'

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  // Proof URL if team.requireProof is enabled
  @Column({ type: 'varchar', nullable: true })
  proofUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  proofType: 'image' | 'video' | null;

  // Relations
  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => TeamAttempt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attemptId' })
  attempt: TeamAttempt;
}
