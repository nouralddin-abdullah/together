import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '@shared/types';
import { Team } from '@features/teams/entities/team.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index() // Index for faster team member lookups
  @Column({ nullable: true })
  teamId: string | null;

  // Many to one (Many User) Joins (One Team)
  @ManyToOne(() => Team, (team) => team.teamMembers)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  nickName: string;

  @Column({ nullable: true })
  avatar: string;

  @Column()
  password: string;

  @Column({ type: 'varchar', default: Role.USER })
  role: Role;

  @Column({ type: 'varchar', nullable: true })
  passwordResetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpired: Date | null;

  // Track last check-in date for BUILD habits (helps quickly check if user did today)
  @Column({ type: 'date', nullable: true })
  lastCheckInDate: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // relations
}
