
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  lastReviewed: string | null; // ISO date string
  nextReviewDate: string | null; // ISO date string
  interval: number; // in days
  status: 'new' | 'learning' | 'mastered';
  sourceQuestion?: string; // To identify cards originating from flashcard.json and prevent re-seeding
}

export type PerformanceRating = 'Mastered' | 'Later' | 'Try Again';

// This interface represents the structure of items in flashcard.json
export interface FlashcardSourceDataItem {
  question: string;
  answer: string;
  // Allow any other fields that might be in the JSON, though unused for now
  [key: string]: any;
}
