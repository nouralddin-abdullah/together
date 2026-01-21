import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Team } from '../../teams/entities/team.entity';
import { AttemptEndReason } from '@shared/types';

@Entity()
export class TeamAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column()
  attemptNumber: number;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ default: 0 })
  daysReached: number;

  @Column({
    type: 'varchar',
    default: AttemptEndReason.ONGOING,
  })
  endReason: AttemptEndReason;

  @Column({ type: 'uuid', nullable: true })
  failedByUserId: string | null;

  @Column({ default: false })
  wasAnonymous: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
