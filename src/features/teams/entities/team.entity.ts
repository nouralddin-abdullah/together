import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  HabitType,
  PrivacyTeam,
  StreakDurations,
  TeamStatus,
} from '../../../shared/types';
import { User } from '../../users/entities/user.entity';
import { TeamCategory } from '@shared/types/team-category.enum';

@Entity()
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  ownerId: string;

  @Column()
  teamName: string;

  @Column()
  maxMembers: number;

  @Column({ default: 1 })
  teamMembersCount: number;

  @Column()
  description: string;

  @Column({
    type: 'varchar',
    default: PrivacyTeam.PUBLIC,
  })
  privacy: PrivacyTeam;

  @Column()
  habitName: string;

  @Column({
    type: 'varchar',
    default: HabitType.QUITE,
  })
  habitType: HabitType;

  @Column({ default: true })
  allowAnonymousFail: boolean;

  @Column({ nullable: true })
  rules: string;

  @Index() // Index for filtering teams by status
  @Column({
    type: 'varchar',
    default: TeamStatus.PENDING,
  })
  status: TeamStatus;

  @Index({ unique: true }) // Unique index for invite code lookups
  @Column({ type: 'varchar', nullable: true })
  inviteCode: string | null;

  @Column({ default: 0 })
  currentTeamStreak: number;

  @Column({ default: 0 })
  topTeamStreak: number;

  @Column({
    type: 'int',
    default: StreakDurations.THIRTY,
  })
  wantedTeamStreak: StreakDurations;

  @Column({
    type: 'varchar',
    default: TeamCategory.RELIGON,
  })
  teamCategory: TeamCategory;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // relations for joins.
  // one to many (One Team) has (Many Users)
  @OneToMany(() => User, (user) => user.team)
  teamMembers: User[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;
}
