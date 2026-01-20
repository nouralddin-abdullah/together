import { DataSource } from 'typeorm';
import { randomBytes, randomUUID, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
import { dataSourceOptions } from './data-source';
import { User } from '../../features/users/entities/user.entity';
import { Team } from '../../features/teams/entities/team.entity';
import { Role } from '../../shared/types/roles.enum';
import { TeamCategory } from '../../shared/types/team-category.enum';
import { StreakDurations } from '../../shared/types/streak-durations.enum';
import { HabitType } from '../../shared/types/habit-type.enum';
import { PrivacyTeam } from '../../shared/types/privacy-team.enum';
import { TeamStatus } from '../../shared/types/team-status.enum';

const teamNames = [
  'Early Risers Club',
  'Fitness Warriors',
  'Code Masters',
  'Book Worms United',
  'Meditation Squad',
  'Running Crew',
  'Study Buddies',
  'Gym Rats',
  'Prayer Circle',
  'Daily Coders',
  'Health First',
  'Morning Joggers',
  'Focus Group',
  'Healthy Habits',
  'Scripture Study',
  'Productivity Pros',
  'Workout Warriors',
  'Learning League',
  'Mindful Mornings',
  'Active Lifestyle',
];

const habitNames = [
  'Wake up at 5 AM',
  'Workout for 30 mins',
  'Code for 1 hour',
  'Read 20 pages',
  'Meditate for 15 mins',
  'Run 5 km',
  'Study for 2 hours',
  'Hit the gym',
  'Morning prayer',
  'Solve 2 coding problems',
  'Drink 8 glasses of water',
  'Jog for 30 mins',
  'No phone for 1 hour',
  'Eat healthy meals',
  'Read scripture daily',
  'Complete 3 tasks',
  'Strength training',
  'Learn something new',
  'Practice gratitude',
  'Walk 10,000 steps',
];

const categories: TeamCategory[] = [
  TeamCategory.FITNESS,
  TeamCategory.FITNESS,
  TeamCategory.CODING,
  TeamCategory.READING,
  TeamCategory.HEALTH,
  TeamCategory.FITNESS,
  TeamCategory.LEARNING,
  TeamCategory.FITNESS,
  TeamCategory.RELIGON,
  TeamCategory.CODING,
  TeamCategory.HEALTH,
  TeamCategory.FITNESS,
  TeamCategory.PRODUCTIVITY,
  TeamCategory.HEALTH,
  TeamCategory.RELIGON,
  TeamCategory.PRODUCTIVITY,
  TeamCategory.FITNESS,
  TeamCategory.LEARNING,
  TeamCategory.HEALTH,
  TeamCategory.FITNESS,
];

const streakDurations: StreakDurations[] = [
  StreakDurations.THIRTY,
  StreakDurations.SIXTY,
  StreakDurations.NINETY,
];

const scrypt = promisify(_scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 32)) as Buffer;
  return `${salt}.${hash.toString('hex')}`;
}

async function seed() {
  const dataSource = new DataSource({
    ...dataSourceOptions,
    entities: [User, Team],
  });

  await dataSource.initialize();
  console.log('🌱 Starting seed...');

  const userRepo = dataSource.getRepository(User);
  const teamRepo = dataSource.getRepository(Team);

  // Hash password once (same for all seed users)
  const hashedPassword = await hashPassword('Password123!');

  const userIds: string[] = [];
  const teamIds: string[] = [];

  // Generate IDs upfront
  for (let i = 0; i < 20; i++) {
    userIds.push(randomUUID());
    teamIds.push(randomUUID());
  }

  // Step 1: Create users WITHOUT teamId first
  const users: User[] = [];
  for (let i = 0; i < 20; i++) {
    const user = userRepo.create({
      id: userIds[i],
      email: `user${i + 1}@example.com`,
      username: `user${i + 1}`,
      nickName: `User ${i + 1}`,
      password: hashedPassword,
      role: Role.USER,
      teamId: null, // No team yet
    });
    users.push(user);
  }

  await userRepo.save(users);
  console.log(`✅ Created ${users.length} users`);

  // Step 2: Create teams (now ownerId FK is satisfied)
  const teams: Team[] = [];
  for (let i = 0; i < 20; i++) {
    const team = teamRepo.create({
      id: teamIds[i],
      ownerId: userIds[i],
      teamName: teamNames[i],
      description: `Welcome to ${teamNames[i]}! Join us on our journey to build great habits together.`,
      rules: 'Be respectful, stay consistent, and support each other!',
      maxMembers: Math.floor(Math.random() * 10) + 5, // 5-14 members
      teamMembersCount: 1,
      privacy: i % 3 === 0 ? PrivacyTeam.PRIVATE : PrivacyTeam.PUBLIC, // Every 3rd team is private
      inviteCode: i % 3 === 0 ? null : randomBytes(6).toString('hex'),
      habitName: habitNames[i],
      habitType: i % 2 === 0 ? HabitType.QUITE : HabitType.BUILD,
      allowAnonymousFail: i % 2 === 0,
      status: TeamStatus.PENDING,
      currentTeamStreak: Math.floor(Math.random() * 20),
      topTeamStreak: Math.floor(Math.random() * 50),
      wantedTeamStreak: streakDurations[i % 3],
      teamCategory: categories[i],
    });
    teams.push(team);
  }

  await teamRepo.save(teams);
  console.log(`✅ Created ${teams.length} teams`);

  // Step 3: Update users with their teamId
  for (let i = 0; i < 20; i++) {
    await userRepo.update(userIds[i], { teamId: teamIds[i] });
  }
  console.log(`✅ Assigned teams to users`);

  await dataSource.destroy();
  console.log('🌱 Seed completed!');
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
