
import type { User as FirebaseUser } from 'firebase/auth';

export interface Flashcard {
  id: string; // Firestore document ID
  front: string;
  back: string;
  lastReviewed: string | null; // ISO date string
  nextReviewDate: string | null; // ISO date string
  interval: number; // in days
  status: 'new' | 'learning' | 'mastered';
  sourceQuestion?: string; // To identify cards originating from flashcard.json
  createdAt?: string; // ISO date string, server timestamp preferred
  updatedAt?: string; // ISO date string
  // userId is implicit via Firestore path, not usually stored in the document itself unless for specific querying needs
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
