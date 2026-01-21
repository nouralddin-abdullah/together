import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { MessageAttachment } from './message-attachment.entity';

/**
 * Message types - user messages vs system notifications
 */
export enum MessageType {
  USER = 'user', // Regular message from a user
  SYSTEM = 'system', // System notification (streak, achievements, etc.)
}

/**
 * System message subtypes for different notifications
 */
export enum SystemMessageType {
  CHALLENGE_STARTED = 'challenge_started', // Challenge has begun!
  STREAK_COMPLETED = 'streak_completed', // User completed their daily goal
  STREAK_FAILED = 'streak_failed', // User failed and streak resets
  STREAK_MILESTONE = 'streak_milestone', // User reached a milestone (7 days, 30 days, etc.)
  USER_JOINED = 'user_joined', // New member joined the team
  USER_LEFT = 'user_left', // Member left the team
  TEAM_GOAL_REACHED = 'team_goal_reached', // Team reached their goal (legacy)
  CHALLENGE_COMPLETED = 'challenge_completed', // Team completed the entire challenge!
}

@Entity('messages')
@Index(['teamId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  /**
   * Message type: 'user' for regular messages, 'system' for notifications
   */
  @Column({ type: 'varchar', default: MessageType.USER })
  messageType: MessageType;

  /**
   * For system messages: what kind of notification is this?
   * NULL for regular user messages.
   */
  @Column({ type: 'varchar', nullable: true })
  systemMessageType: SystemMessageType | null;

  /**
   * The user who sent this message (for user messages)
   * OR the user this notification is about (for system messages)
   * e.g., "Sarah completed day 14!" - senderId = Sarah's ID
   */
  @Column({ type: 'uuid', nullable: true })
  senderId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'senderId' })
  sender: User | null;

  /**
   * The text content of the message.
   */
  @Column({ type: 'text', nullable: true })
  content: string | null;

  /**
   * Optional metadata for system messages (JSON)
   * e.g., { streakDay: 14, previousStreak: 13 }
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'uuid', nullable: true })
  replyToId: string | null;

  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'replyToId' })
  replyTo: Message | null;

  @OneToOne(() => MessageAttachment, (attachment) => attachment.message, {
    cascade: true,
    eager: true,
    nullable: true,
  })
  attachment: MessageAttachment | null;

  @CreateDateColumn()
  createdAt: Date;
}
