
import type { User as FirebaseUser } from 'firebase/auth';

export interface Deck {
  id: string; // Firestore document ID
  name: string;
  userId: string; // To ensure user owns the deck
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface Flashcard {
  id: string; // Firestore document ID
  front: string;
  back: string;
  lastReviewed: string | null; // ISO date string
  nextReviewDate: string | null; // ISO date string
  interval: number; // in days
  status: 'new' | 'learning' | 'mastered';
  deckId?: string | null; // Optional: ID of the deck it belongs to
  sourceQuestion?: string; // To identify cards originating from flashcard.json
  createdAt?: string; // ISO date string, server timestamp preferred
  updatedAt?: string; // ISO date string
}

export type PerformanceRating = 'Mastered' | 'Later' | 'Try Again';

export interface FlashcardSourceDataItem {
  question: string;
  answer: string;
  [key:string]: any;
}

export type AppUser = Pick<FirebaseUser, 'uid' | 'displayName' | 'email' | 'photoURL'> | null;

export interface PomodoroSessionState {
  userId: string;
  status: 'running' | 'paused' | 'idle';
  targetEndTime: number | null;
  pausedTimeLeftSeconds: number | null;
  currentSessionInitialDurationMinutes: number;
  userPreferredDurationMinutes: number;
  notes: string;
  updatedAt: any;
  currentTaskTitle?: string | null; // For displaying task title during Pomodoro
}

// Task Management Types
export type TaskStatus = 'pending' | 'completed';
export type RepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'annually' | 'weekday' | 'weekend';
export type TaskType = 'innie' | 'outie' | 'blackout';

export interface TimeInfo {
  type: 'no_time' | 'datetime' | 'all_day' | 'date_range';
  startDate?: string | null; // ISO Date string: YYYY-MM-DD
  endDate?: string | null;   // ISO Date string: YYYY-MM-DD, for date_range
  time?: string | null;      // HH:mm format, for datetime
}

export interface ArtifactLink {
  flashcardId?: string | null;
}

export type ReminderType = 'none' | 'at_event_time' | '5_minutes_before' | '10_minutes_before' | '15_minutes_before' | '30_minutes_before' | '1_hour_before' | '1_day_before';

export interface ReminderInfo {
  type: ReminderType;
}

export interface CheckinInfo {
  totalCheckinsRequired: number;
  currentCheckins: number;
  // lastCheckinDate?: string | null; // Consider for later to prevent multiple check-ins per day
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  type: TaskType; // Added new field
  repeat: RepeatFrequency;
  timeInfo: TimeInfo;
  artifactLink: ArtifactLink;
  reminderInfo: ReminderInfo;
  checkinInfo?: CheckinInfo | null; // New field for check-in tasks
  createdAt: string;
  updatedAt: string;
}

