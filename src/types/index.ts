
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

// This interface represents the structure of items in flashcard.json
export interface FlashcardSourceDataItem {
  question: string;
  answer: string;
  [key: string]: any;
}

// Simplified user type for AuthContext
export type AppUser = Pick<FirebaseUser, 'uid' | 'displayName' | 'email' | 'photoURL'> | null;

// State for the Pomodoro timer, to be stored in Firestore
export interface PomodoroSessionState {
  userId: string;
  status: 'running' | 'paused' | 'idle';
  targetEndTime: number | null; // Unix timestamp (ms) or null if idle
  pausedTimeLeftSeconds: number | null; // Seconds remaining when paused
  currentSessionInitialDurationMinutes: number; // Duration set when the current/last session started
  userPreferredDurationMinutes: number; // User's default duration for new sessions
  notes: string;
  updatedAt: any; // Firestore serverTimestamp for the last update to this state
}
