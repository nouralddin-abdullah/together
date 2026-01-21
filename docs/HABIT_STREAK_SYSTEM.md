# 🎯 Together App - Habit & Streak System

## Complete Technical Specification

**Version:** 1.0  
**Last Updated:** January 21, 2026

---

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [Team Lifecycle](#2-team-lifecycle)
3. [Lockdown Rules](#3-lockdown-rules)
4. [Habit Types](#4-habit-types)
5. [Data Model](#5-data-model)
6. [Business Logic](#6-business-logic)
7. [API Endpoints](#7-api-endpoints)
8. [Real-time Events](#8-real-time-events)
9. [Dashboard & Statistics](#9-dashboard--statistics)
10. [Team Settings](#10-team-settings)
11. [Edge Cases](#11-edge-cases)
12. [Implementation Phases](#12-implementation-phases)

---

## 1. Core Concepts

### What is Together?

A habit-building app where small teams (2-6 people) commit to a shared habit challenge. The key principle: **accountability through commitment**. Once started, there's no escape - you complete the challenge or fail together.

### Key Principles

| Principle                     | Description                                                       |
| ----------------------------- | ----------------------------------------------------------------- |
| **Collective Accountability** | If one fails, all fail. The streak resets for everyone.           |
| **Lockdown Commitment**       | Once started, no leaving, no joining, no setting changes.         |
| **Transparency**              | Everyone sees everyone's progress (with optional anonymous slip). |
| **Multiple Attempts**         | Failure isn't the end - teams can try again and again.            |

---

## 2. Team Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TEAM STATES                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐        ┌──────────┐        ┌───────────┐            │
│   │ PENDING  │───────►│  ACTIVE  │───────►│ COMPLETED │            │
│   │          │ START  │          │ GOAL   │           │            │
│   │ Settings │        │ LOCKDOWN │ REACHED│  🎉 WIN   │            │
│   │ Open     │        │ No Exit  │        │           │            │
│   └──────────┘        └──────────┘        └───────────┘            │
│        │                   │                                        │
│   - Edit settings     - No edits                                    │
│   - Add members       - No join                                     │
│   - Remove members    - No leave                                    │
│   - Leave team        - Must complete                               │
│                       - Multiple attempts                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Status Definitions

| Status      | Description                                                 | Allowed Actions                                    |
| ----------- | ----------------------------------------------------------- | -------------------------------------------------- |
| `PENDING`   | Waiting to start. Recruiting members, configuring settings. | Edit settings, join/leave, invite, start challenge |
| `ACTIVE`    | Challenge in progress. **LOCKDOWN MODE.**                   | Check-in, report slip, chat only                   |
| `COMPLETED` | Team reached `wantedTeamStreak` days. Victory!              | View stats, chat, celebrate                        |

---

## 3. Lockdown Rules

### 🔒 When Status = ACTIVE

| Action             | Allowed? | Reason                       |
| ------------------ | -------- | ---------------------------- |
| Edit team settings | ❌ NO    | Commitment is final          |
| Join team          | ❌ NO    | No new members mid-challenge |
| Leave team         | ❌ NO    | No escape - you committed    |
| Kick member        | ❌ NO    | Owner can't remove anyone    |
| Delete team        | ❌ NO    | Challenge must conclude      |
| Transfer ownership | ❌ NO    | Owner is locked in too       |
| Change habit       | ❌ NO    | You chose this habit         |
| Change goal days   | ❌ NO    | 30/60/90 is final            |
| Chat               | ✅ YES   | Communication always open    |
| Check-in           | ✅ YES   | Core functionality           |
| Report slip        | ✅ YES   | Core functionality           |

### 🔓 When Status = PENDING

| Action                    | Allowed? |
| ------------------------- | -------- |
| All settings editable     | ✅ YES   |
| Members can join          | ✅ YES   |
| Members can leave         | ✅ YES   |
| Owner can kick members    | ✅ YES   |
| Owner can start challenge | ✅ YES   |
| Owner can delete team     | ✅ YES   |

---

## 4. Habit Types

### 4.1 BUILD Habit (بناء عادة)

**Purpose:** Establish a positive daily habit.

**Examples:**

- صلاة الفجر في وقتها
- تمرين 30 دقيقة
- قراءة 20 صفحة
- شرب 8 أكواب ماء

**Behavior:**

```
┌────────────────────────────────────────────────────────────────┐
│                    BUILD HABIT - DAILY CYCLE                    │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Day Start (00:00)                                             │
│       │                                                         │
│       ▼                                                         │
│  Each member has until 23:59 to check-in                       │
│       │                                                         │
│       ├── User opens app ──► Sees "Complete Today" button      │
│       │                            │                            │
│       │                            ▼                            │
│       │                      ┌───────────┐                     │
│       │                      │ requireProof? │                  │
│       │                      └─────┬─────┘                     │
│       │                       YES  │  NO                        │
│       │                        │   │                            │
│       │                        ▼   ▼                            │
│       │                   Upload  Just                         │
│       │                   Photo/  Click ✓                      │
│       │                   Video                                 │
│       │                        │                                │
│       │                        ▼                                │
│       │               DailyProgress.completed = true            │
│       │               Chat: "✓ أحمد أكمل اليوم"                │
│       │                                                         │
│  Midnight (00:00 next day)                                     │
│       │                                                         │
│       ▼                                                         │
│  CRON JOB evaluates:                                           │
│       │                                                         │
│       ├── All completed? ──► Streak++ ──► Check milestone      │
│       │                                                         │
│       └── Someone missed? ──► STREAK RESET ──► New attempt     │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 QUIT Habit (ترك عادة)

**Purpose:** Break a bad habit together.

**Examples:**

- ترك التدخين
- ترك السهر
- ترك السوشيال ميديا
- ترك الأكل غير الصحي

**Behavior:**

```
┌────────────────────────────────────────────────────────────────┐
│                    QUIT HABIT - REACTIVE MODE                   │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Normal State:                                                  │
│  ─────────────                                                  │
│  - No daily check-in required                                  │
│  - Streak continues automatically                              │
│  - Assumed everyone is staying clean                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 IF SOMEONE SLIPS                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│                   ┌─────────────────┐                          │
│                   │  "انتكست" Button │                          │
│                   └────────┬────────┘                          │
│                            │                                    │
│                            ▼                                    │
│                   ┌─────────────────┐                          │
│                   │ Report as       │                          │
│                   │ Anonymous?      │                          │
│                   │ [ Yes ] [ No ]  │  ◄── User's CHOICE       │
│                   └────────┬────────┘                          │
│                            │                                    │
│               ┌────────────┴────────────┐                      │
│               │                         │                       │
│        Chose Anonymous           Chose Public                  │
│               │                         │                       │
│               ▼                         ▼                       │
│      Chat: "أحد الأعضاء         Chat: "أحمد انتكس"             │
│             انتكس"                      │                       │
│               │                         │                       │
│               └────────────┬────────────┘                      │
│                            │                                    │
│                            ▼                                    │
│                   IMMEDIATE RESET                               │
│                   - currentTeamStreak = 0                       │
│                   - TeamAttempt ends                            │
│                   - New TeamAttempt starts                      │
│                   - Chat: "السلسلة انتهت. نبدأ من جديد!"       │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Key Differences

| Aspect             | BUILD                       | QUIT                  |
| ------------------ | --------------------------- | --------------------- |
| Daily action       | Must check-in ✓             | Nothing (unless slip) |
| Failure trigger    | Not checking in by midnight | User reports slip     |
| Anonymous option   | ❌ Not applicable           | ✅ User can choose    |
| Proof option       | ✅ Photo/video for check-in | ❌ Not applicable     |
| Default assumption | Haven't done it yet         | Staying clean         |

---

## 5. Data Model

### 5.1 Existing Entities (Modified)

#### Team Entity - New Fields

```typescript
@Entity()
export class Team {
  // ... existing fields ...

  // NEW: Require photo/video proof for BUILD check-ins
  @Column({ default: false })
  requireProof: boolean;

  // Clarification: This means users CAN choose anonymous, not forced
  @Column({ default: true })
  allowAnonymousFail: boolean; // Renamed conceptually to: allowAnonymousSlip
}
```

#### User Entity - New Fields

```typescript
@Entity()
export class User {
  // ... existing fields ...

  // Track today's check-in status (for BUILD habits)
  @Column({ type: 'date', nullable: true })
  lastCheckInDate: string; // 'YYYY-MM-DD' - helps quickly check if user did today
}
```

> **Note:** No personal streak fields needed. The team succeeds or fails together, so `team.currentTeamStreak` IS everyone's streak.

### 5.2 New Entities

#### TeamAttempt (محاولة الفريق)

Tracks each streak attempt for statistics and history.

```typescript
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
  attemptNumber: number; // 1, 2, 3... auto-increment per team

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date; // null if ongoing

  @Column({ default: 0 })
  daysReached: number;

  @Column({
    type: 'varchar',
    default: 'ongoing',
  })
  endReason: 'ongoing' | 'failed' | 'completed';

  // Who caused the failure (null if anonymous or completed or ongoing)
  @Column({ type: 'uuid', nullable: true })
  failedByUserId: string | null;

  // Was the failure reported anonymously?
  @Column({ default: false })
  wasAnonymous: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
```

#### DailyProgress (التقدم اليومي)

For **BUILD** habits only - tracks daily check-ins.

```typescript
@Entity()
@Index(['teamId', 'userId', 'date'], { unique: true })
export class DailyProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  userId: string;

  @Column()
  attemptId: string; // FK to TeamAttempt

  @Column({ type: 'date' })
  date: string; // 'YYYY-MM-DD'

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  // Proof URL if requireProof is enabled
  @Column({ type: 'varchar', nullable: true })
  proofUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  proofType: 'image' | 'video' | null;

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
```

#### SlipReport (بلاغ الانتكاسة)

For **QUIT** habits only - when someone slips.

```typescript
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

  // User's choice - did they want to be anonymous?
  @Column({ default: false })
  reportedAnonymously: boolean;

  // Optional note
  @Column({ type: 'text', nullable: true })
  note: string | null;

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
```

### 5.3 Entity Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIPS                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐ 1:N ┌──────────────┐                                  │
│  │   Team   │────►│ TeamAttempt  │                                  │
│  └────┬─────┘     └──────┬───────┘                                  │
│       │                  │                                           │
│       │ 1:N              │ 1:N                                       │
│       │                  │                                           │
│       ▼                  ├──────────────┐                           │
│  ┌──────────┐            │              │                           │
│  │   User   │            ▼              ▼                           │
│  └──────────┘     ┌──────────────┐ ┌────────────┐                   │
│       │           │DailyProgress │ │ SlipReport │                   │
│       │           │  (BUILD)     │ │  (QUIT)    │                   │
│       │           └──────────────┘ └────────────┘                   │
│       │                  │              │                           │
│       │ N:1              │              │                           │
│       └──────────────────┴──────────────┘                           │
│                    (User owns these)                                 │
│                                                                      │
│  ┌──────────┐ N:1 ┌──────────┐                                      │
│  │ Message  │────►│   Team   │                                      │
│  └──────────┘     └──────────┘                                      │
│       │                                                              │
│       │ System messages for:                                        │
│       │ - STREAK_COMPLETED (check-in)                               │
│       │ - STREAK_FAILED (slip/missed)                               │
│       │ - STREAK_MILESTONE (7/14/21/30/60/90 days)                  │
│       │ - TEAM_GOAL_REACHED (challenge complete!)                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Business Logic

### 6.1 Starting the Challenge

```
Preconditions:
  - Team status = PENDING
  - At least 2 members (minMembers)
  - All settings configured

Action: Owner clicks "Start Challenge"

Process:
  1. Validate team has enough members
  2. Set status = ACTIVE
  3. Create first TeamAttempt (attemptNumber = 1)
  4. Set currentTeamStreak = 0
  5. Lock all settings
  6. Send chat: "🚀 التحدي بدأ! حظاً موفقاً للجميع"
  7. (BUILD only) Create empty DailyProgress for today for all members

Result:
  - Team is now in LOCKDOWN mode
  - No one can leave or join
  - Challenge officially begins
```

### 6.2 BUILD: Daily Check-in

```
Endpoint: POST /habits/check-in

Preconditions:
  - User is in a team
  - Team status = ACTIVE
  - Team habitType = BUILD
  - User hasn't checked in today

Request Body:
  {
    proofUrl?: string,    // Required if team.requireProof = true
    proofType?: 'image' | 'video'
  }

Process:
  1. Validate user hasn't already checked in today
  2. If requireProof and no proof provided → Error
  3. Find or create DailyProgress for (teamId, userId, today)
  4. Set completed = true, completedAt = now
  5. Save proof URL if provided
  6. Update user's lastCheckInDate
  7. Send chat system message: "✓ {nickName} أكمل اليوم"
  8. Emit WebSocket event to team room
  9. Check if ALL members now completed today
      - If yes: celebrate in chat (optional real-time message)

Response:
  {
    success: true,
    message: "تم تسجيل إنجازك! 🎉",
    data: {
      date: "2026-01-21",
      completedAt: "2026-01-21T08:30:00Z",
      teamProgress: {
        completed: ["userId1", "userId2"],
        pending: ["userId3"]
      }
    }
  }
```

### 6.3 QUIT: Report Slip

```
Endpoint: POST /habits/report-slip

Preconditions:
  - User is in a team
  - Team status = ACTIVE
  - Team habitType = QUIT

Request Body:
  {
    anonymous: boolean,   // User's choice
    note?: string         // Optional explanation
  }

Process:
  1. Get current TeamAttempt
  2. Create SlipReport record
  3. End current TeamAttempt:
     - endedAt = now
     - daysReached = currentTeamStreak
     - endReason = 'failed'
     - failedByUserId = userId (even if anonymous, stored for stats)
     - wasAnonymous = request.anonymous
  4. Reset team:
     - currentTeamStreak = 0
  5. Create new TeamAttempt (attemptNumber++)
  6. Send chat system message:
     - If anonymous: "أحد الأعضاء انتكس. السلسلة انتهت. نبدأ من جديد!"
     - If public: "{nickName} انتكس. السلسلة انتهت. نبدأ من جديد!"
  7. Emit WebSocket event to team room

Response:
  {
    success: true,
    message: "شكراً على صدقك. لا بأس، نبدأ من جديد غداً!",
    data: {
      attemptEnded: 2,
      daysReached: 14,
      newAttemptNumber: 3
    }
  }

Note: anonymous only hides identity in CHAT, not in database.
      Stats still track who failed for dashboard purposes.
```

### 6.4 Midnight CRON Job (BUILD only)

```
Job: ProcessDailyBuildProgress
Schedule: 00:05 daily (5 mins after midnight UTC)
         Or: Use team timezone if implemented

For each Team where:
  - status = 'ACTIVE'
  - habitType = 'BUILD'

Process:
  1. Get yesterday's date (the day that just ended)
  2. Get all team members
  3. Get DailyProgress records for yesterday

  4. Identify who completed and who didn't:
     - completedMembers = users with DailyProgress.completed = true
     - failedMembers = users without completion

  5. IF all members completed (failedMembers.length === 0):

     a. Increment streak:
        - currentTeamStreak++
        - Update topTeamStreak if new record
        - Update current TeamAttempt.daysReached

     b. Check milestones (7, 14, 21, 30, 60, 90):
        - If milestone: Send STREAK_MILESTONE to chat
        - "🔥 يوم {day}! استمروا!"

     c. Check goal completion:
        IF currentTeamStreak >= wantedTeamStreak:
          - status = 'COMPLETED'
          - TeamAttempt.endReason = 'completed'
          - TeamAttempt.endedAt = now
          - Send TEAM_GOAL_REACHED to chat
          - "🎉 مبروك! أكملتم تحدي الـ {days} يوم!"

  6. ELSE (someone didn't complete):

     a. End current attempt:
        - TeamAttempt.endedAt = now
        - TeamAttempt.endReason = 'failed'
        - TeamAttempt.daysReached = currentTeamStreak
        - TeamAttempt.failedByUserId = first failed user (or null)

     b. Reset streak:
        - currentTeamStreak = 0

     c. Create new TeamAttempt:
        - attemptNumber = previous + 1
        - startedAt = now

     d. Send failure message to chat:
        - List who didn't complete
        - "❌ السلسلة انتهت. {names} لم يكملوا. نبدأ من جديد!"

  7. Create today's empty DailyProgress for all members
```

### 6.5 Challenge Completion

```
Trigger: currentTeamStreak >= wantedTeamStreak

Process:
  1. Set team status = COMPLETED
  2. End TeamAttempt with endReason = 'completed'
  3. Send celebration to chat
  4. Maybe: Send email congratulations
  5. Team remains in read-only celebration mode

Post-Completion Options (Future):
  - Start new challenge with same team
  - Disband team
  - View final stats
```

---

## 7. API Endpoints

### 7.1 Habits Module

| Method | Endpoint              | Description                   | Habit Type |
| ------ | --------------------- | ----------------------------- | ---------- |
| `POST` | `/habits/check-in`    | Complete today's habit        | BUILD      |
| `POST` | `/habits/report-slip` | Report a slip/relapse         | QUIT       |
| `GET`  | `/habits/today`       | Get my status today           | Both       |
| `GET`  | `/habits/team-status` | Get all members' status today | Both       |

### 7.2 Team Endpoints (Modified)

| Method   | Endpoint                     | Lockdown?            | Notes            |
| -------- | ---------------------------- | -------------------- | ---------------- |
| `PATCH`  | `/teams/:id`                 | ❌ Blocked if ACTIVE | Settings locked  |
| `POST`   | `/teams/:id/join`            | ❌ Blocked if ACTIVE | No new members   |
| `POST`   | `/teams/:id/leave`           | ❌ Blocked if ACTIVE | No escape        |
| `DELETE` | `/teams/:id/members/:userId` | ❌ Blocked if ACTIVE | No kicks         |
| `POST`   | `/teams/:id/start`           | Only from PENDING    | Starts challenge |

### 7.3 Statistics Endpoints

| Method | Endpoint                         | Description           |
| ------ | -------------------------------- | --------------------- |
| `GET`  | `/teams/:id/stats`               | Full team statistics  |
| `GET`  | `/teams/:id/attempts`            | List all attempts     |
| `GET`  | `/teams/:id/attempts/:attemptId` | Detailed attempt view |
| `GET`  | `/users/me/stats`                | Personal habit stats  |

---

## 8. Real-time Events

### 8.1 WebSocket Events

| Event               | Direction     | Trigger                     | Payload                             |
| ------------------- | ------------- | --------------------------- | ----------------------------------- |
| `habit:checkin`     | Server → Team | User checks in              | `{ userId, nickName, time }`        |
| `habit:allComplete` | Server → Team | All members done today      | `{ day, members }`                  |
| `habit:slip`        | Server → Team | User reports slip           | `{ anonymous, nickName?, message }` |
| `habit:reset`       | Server → Team | Streak reset (cron or slip) | `{ reason, attemptNumber }`         |
| `habit:milestone`   | Server → Team | Reached 7/14/21/30/60/90    | `{ day, message }`                  |
| `habit:completed`   | Server → Team | Challenge finished!         | `{ totalDays, attempts }`           |

### 8.2 Chat System Messages

These events also create system messages in chat:

```typescript
// Check-in (BUILD)
{
  messageType: 'system',
  systemMessageType: 'STREAK_COMPLETED',
  content: '✓ أحمد أكمل اليوم',
  metadata: { userId, day: 14 }
}

// Slip (QUIT)
{
  messageType: 'system',
  systemMessageType: 'STREAK_FAILED',
  content: 'أحد الأعضاء انتكس. السلسلة انتهت.',  // or with name
  metadata: { anonymous: true, attemptNumber: 2, daysReached: 14 }
}

// Milestone
{
  messageType: 'system',
  systemMessageType: 'STREAK_MILESTONE',
  content: '🔥 أسبوع كامل! يوم 7 من 30',
  metadata: { day: 7, goal: 30 }
}

// Goal Reached
{
  messageType: 'system',
  systemMessageType: 'TEAM_GOAL_REACHED',
  content: '🎉 مبروك! أكملتم تحدي الـ 30 يوم!',
  metadata: { totalDays: 30, totalAttempts: 3 }
}
```

---

## 9. Dashboard & Statistics

### 9.1 Team Dashboard Response

```json
{
  "team": {
    "id": "uuid",
    "name": "نادي البكور",
    "habitName": "صلاة الفجر",
    "habitType": "BUILD",
    "status": "ACTIVE",
    "goal": 30,
    "requireProof": true,
    "allowAnonymousFail": true
  },

  "currentAttempt": {
    "number": 3,
    "startedAt": "2026-01-10T00:00:00Z",
    "daysCompleted": 11,
    "progressPercent": 37
  },

  "streak": {
    "current": 11,
    "best": 14,
    "goal": 30,
    "remaining": 19
  },

  "todayStatus": {
    "date": "2026-01-21",
    "habitType": "BUILD",
    "deadline": "23:59",
    "members": [
      {
        "userId": "uuid1",
        "nickName": "أحمد",
        "avatar": "url",
        "completed": true,
        "completedAt": "2026-01-21T05:30:00Z",
        "proofUrl": "https://..."
      },
      {
        "userId": "uuid2",
        "nickName": "سارة",
        "avatar": "url",
        "completed": true,
        "completedAt": "2026-01-21T06:15:00Z",
        "proofUrl": null
      },
      {
        "userId": "uuid3",
        "nickName": "محمد",
        "avatar": "url",
        "completed": false,
        "completedAt": null,
        "proofUrl": null
      }
    ],
    "summary": {
      "total": 3,
      "completed": 2,
      "pending": 1
    }
  },

  "history": {
    "totalAttempts": 3,
    "longestStreak": 14,
    "averageStreak": 9.3,
    "successRate": 0,
    "attempts": [
      { "number": 1, "days": 7, "result": "failed", "endedAt": "..." },
      { "number": 2, "days": 14, "result": "failed", "endedAt": "..." },
      { "number": 3, "days": 11, "result": "ongoing", "endedAt": null }
    ]
  },

  "memberStats": [
    {
      "userId": "uuid1",
      "nickName": "أحمد",
      "checkInRate": 95,
      "missedDays": 1,
      "causedResets": 0
    },
    {
      "userId": "uuid2",
      "nickName": "سارة",
      "checkInRate": 92,
      "missedDays": 2,
      "causedResets": 1
    }
  ]
}
```

### 9.2 Personal Stats Response

```json
{
  "user": {
    "id": "uuid",
    "nickName": "أحمد"
  },
  "teamInfo": {
    "teamId": "uuid",
    "teamName": "نادي البكور",
    "habitName": "صلاة الفجر",
    "habitType": "BUILD",
    "role": "member",
    "currentStreak": 11,
    "bestStreak": 14,
    "goal": 30
  },
  "myContribution": {
    "totalCheckIns": 45,
    "checkInRate": 95,
    "missedDays": 2,
    "averageCheckInTime": "06:30",
    "causedTeamResets": 0
  }
}
```

> **Note:** No "personal streak" - your streak IS the team streak. `myContribution` shows your individual performance within the team effort.

---

## 10. Team Settings

### 10.1 Settings Table

| Setting              | Type      | Editable When | Description                             |
| -------------------- | --------- | ------------- | --------------------------------------- |
| `teamName`           | string    | PENDING only  | Team display name                       |
| `description`        | text      | PENDING only  | Team description                        |
| `habitName`          | string    | PENDING only  | The habit to build/quit                 |
| `habitType`          | enum      | PENDING only  | BUILD or QUIT                           |
| `maxMembers`         | int (2-6) | PENDING only  | Maximum team size                       |
| `wantedTeamStreak`   | enum      | PENDING only  | 30, 60, or 90 days                      |
| `privacy`            | enum      | PENDING only  | PUBLIC or PRIVATE                       |
| `allowAnonymousFail` | bool      | PENDING only  | Can users report slip anonymously?      |
| `requireProof`       | bool      | PENDING only  | Require photo/video for BUILD check-in? |
| `rules`              | text      | PENDING only  | Custom team rules                       |

### 10.2 Lockdown Enforcement

```typescript
// In TeamsService.update()

async updateTeam(teamId: string, userId: string, dto: UpdateTeamDto) {
  const team = await this.findOne(teamId);

  // LOCKDOWN CHECK
  if (team.status !== TeamStatus.PENDING) {
    throw new ForbiddenException(
      'لا يمكن تعديل إعدادات الفريق بعد بدء التحدي'
    );
  }

  // Only owner can edit
  if (team.ownerId !== userId) {
    throw new ForbiddenException('فقط قائد الفريق يمكنه تعديل الإعدادات');
  }

  // Proceed with update...
}
```

---

## 11. Edge Cases

### 11.1 Handled Scenarios

| Scenario                             | Solution                                     |
| ------------------------------------ | -------------------------------------------- |
| User tries to leave ACTIVE team      | Error: "لا يمكنك الخروج بعد بدء التحدي"      |
| Owner tries to kick member           | Error: "لا يمكن إزالة أعضاء بعد بدء التحدي"  |
| New user tries to join ACTIVE team   | Error: "لا يمكن الانضمام لفريق في تحدي قائم" |
| User checks in twice same day        | Idempotent: Return success, no duplicate     |
| CRON job fails/misses                | Catch up on next run, process missed days    |
| User submits check-in after midnight | Apply to current day, not previous           |
| Team with 1 member tries to start    | Error: "يجب أن يكون هناك عضوين على الأقل"    |
| requireProof but user has no image   | Error: "يجب إرفاق صورة أو فيديو كإثبات"      |
| Anonymous slip with 2 members        | Still show anonymous (could be either)       |

### 11.2 Timezone Handling

**Current approach:** UTC-based

- All timestamps stored in UTC
- Midnight CRON runs at 00:05 UTC
- Frontend displays in user's local time

**Future enhancement:** Team timezone

- Owner sets team timezone during PENDING
- CRON respects team timezone for deadline
- Stored as `team.timezone` column

---

## 12. Implementation Phases

### Phase 1: Core Entities (Priority: HIGH)

- [ ] Create `TeamAttempt` entity
- [ ] Create `DailyProgress` entity
- [ ] Create `SlipReport` entity
- [ ] Add `requireProof` to Team entity
- [ ] Add personal streak fields to User entity
- [ ] Generate and run migrations

### Phase 2: Lockdown Logic (Priority: HIGH)

- [ ] Add status check to `TeamsService.update()`
- [ ] Add status check to join team endpoint
- [ ] Add status check to leave team endpoint
- [ ] Add status check to kick member endpoint
- [ ] Create `POST /teams/:id/start` endpoint

### Phase 3: Habit Actions (Priority: HIGH)

- [ ] Create `HabitsModule`
- [ ] Implement `POST /habits/check-in` for BUILD
- [ ] Implement `POST /habits/report-slip` for QUIT
- [ ] Implement `GET /habits/today`
- [ ] Implement `GET /habits/team-status`

### Phase 4: CRON Job (Priority: HIGH)

- [ ] Set up scheduled task infrastructure (Bull or @nestjs/schedule)
- [ ] Implement midnight BUILD evaluation job
- [ ] Handle streak increment
- [ ] Handle failure/reset logic
- [ ] Create new TeamAttempt on reset

### Phase 5: Real-time & Chat (Priority: MEDIUM)

- [ ] Emit WebSocket events on check-in
- [ ] Emit WebSocket events on slip
- [ ] Create system messages in chat
- [ ] Handle milestone notifications

### Phase 6: Statistics (Priority: MEDIUM)

- [ ] Implement `GET /teams/:id/stats`
- [ ] Implement `GET /teams/:id/attempts`
- [ ] Implement `GET /users/me/stats`
- [ ] Calculate aggregated statistics

### Phase 7: Proof Upload (Priority: LOW)

- [ ] Integrate with existing Storage module
- [ ] Add proof upload to check-in flow
- [ ] Display proof in dashboard/chat

---

## Appendix: Enums Reference

```typescript
// TeamStatus
enum TeamStatus {
  PENDING = 'pending', // Recruiting, settings open
  ACTIVE = 'active', // LOCKDOWN - challenge running
  COMPLETED = 'completed', // Goal reached - celebration mode
}

// HabitType
enum HabitType {
  BUILD = 'build', // Daily check-in required
  QUIT = 'quit', // Report slips only
}

// StreakDurations
enum StreakDurations {
  THIRTY = 30,
  SIXTY = 60,
  NINETY = 90,
}

// AttemptEndReason
enum AttemptEndReason {
  ONGOING = 'ongoing',
  FAILED = 'failed',
  COMPLETED = 'completed',
}

// SystemMessageType (existing)
enum SystemMessageType {
  STREAK_COMPLETED = 'streak_completed',
  STREAK_FAILED = 'streak_failed',
  STREAK_MILESTONE = 'streak_milestone',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  TEAM_GOAL_REACHED = 'team_goal_reached',
}
```

---

**End of Specification**

_Ready for implementation! 🚀_
