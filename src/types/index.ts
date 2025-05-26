export interface Flashcard {
  id: string;
  front: string;
  back: string;
  lastReviewed: string | null; // ISO date string
  nextReviewDate: string | null; // ISO date string
  interval: number; // in days
  status: 'new' | 'learning' | 'mastered';
  // Optional fields to store original JSON data if needed, helps with identification
  originalCharacter?: string;
  originalPinyin?: string;
}

export type PerformanceRating = 'Mastered' | 'Later' | 'Try Again';

// This interface can represent the structure of items in flashcard.json
export interface FlashcardSourceDataItem {
  pinyin: string;
  character: string;
  explanation?: string;
  translation?: string;
  note?: string;
  meaning?: string;
  // Allow any other fields that might be in the JSON
  [key: string]: any;
}
