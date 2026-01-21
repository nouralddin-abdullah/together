import {
  Column,
  CreateDateColumn,
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
 * SlipReport - Records when a user slips for QUIT habits
 *
 * When a user reports a slip ("انتكست"), this ends the current attempt
 * and resets the team streak. Only used for QUIT habit types.
 */
@Entity()
export class SlipReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  userId: string; // Who slipped

  @Column()
  attemptId: string; // Which attempt this ended

  @Column({ type: 'timestamp' })
  reportedAt: Date;

  // User's choice - did they want to be anonymous in chat?
  // Note: Identity is still stored in database for stats
  @Column({ default: false })
  reportedAnonymously: boolean;

  // Optional note/explanation from user
  @Column({ type: 'text', nullable: true })
  note: string | null;

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

  @CreateDateColumn()
  createdAt: Date;
}
