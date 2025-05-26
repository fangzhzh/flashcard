export interface Flashcard {
  id: string;
  front: string;
  back: string;
  lastReviewed: string | null; // ISO date string
  nextReviewDate: string | null; // ISO date string
  interval: number; // in days
  status: 'new' | 'learning' | 'mastered';
}

export type PerformanceRating = 'Mastered' | 'Later' | 'Try Again';
