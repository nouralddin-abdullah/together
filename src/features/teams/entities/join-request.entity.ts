import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JoinRequestStatus } from '@shared/types';
import { User } from '../../users/entities/user.entity';
import { Team } from './team.entity';

@Entity()
@Index(['userId', 'teamId'], { unique: true }) // One pending request per user per team
export class JoinRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Index()
  @Column()
  teamId: string;

  @Column({ nullable: true })
  note: string;

  @Column({
    type: 'varchar',
    default: JoinRequestStatus.PENDING,
  })
  status: JoinRequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'teamId' })
  team: Team;
}
