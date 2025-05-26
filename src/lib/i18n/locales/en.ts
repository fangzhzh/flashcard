// src/lib/i18n/locales/en.ts
export default {
  // Header
  'header.title': 'FlashFlow',
  'nav.dashboard': 'Dashboard',
  'nav.manage': 'Manage Cards',
  'nav.review': 'Review',
  'theme.toggle': 'Toggle theme',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',
  'lang.switch.en': 'English',
  'lang.switch.zh': '中文',

  // Metadata
  'metadata.title': 'FlashFlow',
  'metadata.description': 'Master your studies with AI-powered flashcards.',

  // Dashboard Page (src/app/[locale]/page.tsx)
  'dashboard.welcome': 'Welcome to FlashFlow',
  'dashboard.button.create': 'Create New Card',
  'dashboard.button.manage': 'Manage Cards',
  'dashboard.button.review': 'Start Review',
  'dashboard.howTo.title': 'How to use FlashFlow',
  'dashboard.howTo.step1': 'Add new flashcards with a question and answer for each.',
  'dashboard.howTo.step2': 'Review your cards regularly. The app uses a smart algorithm to schedule reviews.',
  'dashboard.howTo.step3': "Track your progress on the dashboard and see how many cards you've mastered!",

  // Progress Dashboard Component (src/components/ProgressDashboard.tsx)
  'progress.total': 'Total Cards',
  'progress.mastered': 'Mastered',
  'progress.learning': 'Learning',
  'progress.dueToday': 'Due Today',
  'progress.loading': 'Loading stats...',

  // Flashcards Page (src/app/[locale]/flashcards/page.tsx)
  'flashcards.title': 'Your Flashcards',
  'flashcards.button.create': 'Create New Card',
  // FlashcardListClient
  'flashcards.list.loading': 'Loading your flashcards...',
  'flashcards.list.empty.title': 'No Flashcards Yet!',
  'flashcards.list.empty.description': 'You haven\'t created any flashcards. Click the "Create New Card" button to get started.',

  // Flashcard Item (src/components/FlashcardItem.tsx)
  'flashcard.item.nextReview': 'Next review',
  'flashcard.item.showAnswer': 'Show Answer',
  'flashcard.item.hideAnswer': 'Hide Answer',
  'flashcard.item.edit': 'Edit',
  'flashcard.item.delete': 'Delete',
  'flashcard.item.delete.confirm.title': 'Are you sure?',
  'flashcard.item.delete.confirm.description': 'This action cannot be undone. This will permanently delete this flashcard.',
  'flashcard.item.delete.confirm.cancel': 'Cancel',
  'flashcard.item.delete.confirm.delete': 'Delete',

  // Flashcard Form Page (src/components/FlashcardFormPage.tsx)
  'flashcard.form.page.button.back': 'Back',
  'flashcard.form.page.title.edit': 'Edit Flashcard',
  'flashcard.form.page.title.create.batch': 'Create Flashcards (Batch Mode)',
  'flashcard.form.page.title.create.single': 'Create New Flashcard',
  'flashcard.form.page.button.switchToBatch': 'Switch to Batch Mode',
  'flashcard.form.page.button.switchToSingle': 'Switch to Single Card Mode',
  'flashcard.form.page.loading': 'Loading form...',
  // FlashcardForm
  'flashcard.form.title.edit': 'Edit Flashcard',
  'flashcard.form.title.create': 'Create New Flashcard',
  'flashcard.form.label.front': 'Front',
  'flashcard.form.placeholder.front': 'Enter question or term...',
  'flashcard.form.label.back': 'Back',
  'flashcard.form.placeholder.back': 'Enter answer or explanation...',
  'flashcard.form.button.create': 'Create Flashcard',
  'flashcard.form.button.update': 'Update Flashcard',
  'flashcard.form.button.saving': 'Saving...',
  // BatchFlashcardForm
  'flashcard.batchForm.title': 'Create Flashcards (Batch Mode)',
  'flashcard.batchForm.label.input': 'Batch Input',
  'flashcard.batchForm.placeholder': "Enter flashcards, one per line, in the format: question:answer\nExample:\nWhat is the capital of France?:Paris\n2 + 2?:4",
  'flashcard.batchForm.description': 'Each line should contain one flashcard. The question and answer should be separated by a colon (:).',
  'flashcard.batchForm.button.save': 'Save Batch Flashcards',
  'flashcard.batchForm.button.saving': 'Saving Batch...',
  // Toasts
  'toast.flashcard.notFound': 'Flashcard not found.',
  'toast.flashcard.created': 'Flashcard created successfully.',
  'toast.flashcard.updated': 'Flashcard updated successfully.',
  'toast.flashcard.deleted': 'Flashcard deleted.',
  'toast.flashcard.error.save': 'Failed to save flashcard.',
  'toast.flashcard.error.delete': 'Failed to delete flashcard.',
  'toast.batch.error.parse': 'Some lines were not processed. Please use "question:answer" format for each line.',
  'toast.batch.error.noValidCards': "No valid cards found. No cards were added. Ensure cards are in 'question:answer' format and not empty.",
  'toast.batch.error.emptyInput': 'Batch input is empty.',
  'toast.batch.success': '{count} flashcard(s) created successfully from batch.',
  'toast.batch.error.save': 'Failed to save batch flashcards.',

  // Review Page (src/app/[locale]/review/ReviewModeClient.tsx)
  'review.loading': 'Loading review session...',
  'review.noCards.title': 'No Flashcards Yet!',
  'review.noCards.description': 'Create some flashcards to start your learning journey.',
  'review.noCards.button.create': 'Create Flashcards',
  'review.ready.title': 'Ready to Review?',
  'review.ready.due.text': 'You have {count} card(s) due for spaced repetition.',
  'review.ready.due.none': 'No cards are currently due for spaced repetition.',
  'review.button.startSpaced': 'Start Spaced Repetition ({count})',
  'review.button.reviewAll': 'Review All Cards ({count})',
  'review.tip.noSpacedRepetition': 'Tip: Create more cards or wait for scheduled reviews for the spaced repetition mode.',
  'review.sessionComplete.title': 'Session Complete!',
  'review.sessionComplete.description': "You've reviewed all cards in this session. What's next?",
  'review.sessionComplete.button.backToDashboard': 'Back to Dashboard',
  'review.sessionComplete.button.reviewAllAgain': 'Review All Cards Again ({count})',
  'review.loadingCard': 'Loading card...',
  'review.cardProgress': 'Card {currentIndex} of {totalCards}',
  'review.button.flip.showQuestion': 'Show Question',
  'review.button.flip.showAnswer': 'Show Answer',
  'review.button.progress.tryAgain': 'Try Again',
  'review.button.progress.later': 'Later',
  'review.button.progress.mastered': 'Mastered',
  'review.processing': 'Processing...',
  'toast.progress.saved': 'Progress Saved',
  'toast.progress.saved.description': 'Card marked as "{performance}". Next review on {nextReviewDate}.',
  'toast.progress.error': 'Could not save progress: {errorMessage}. Please try again.',

  // General
  'success': 'Success',
  'error': 'Error',

} as const;
