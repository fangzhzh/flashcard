# FlashFlow: Comprehensive Project Documentation

FlashFlow is a modern web application designed to enhance learning and productivity through a powerful combination of flashcards, task management, and the Pomodoro Technique. It provides a seamless, integrated workflow for users to define high-level goals, break them down into actionable tasks, create supporting study materials, and maintain focus using a built-in timer.

The application is architected to be "local-first," offering core functionality offline while providing enhanced, cloud-synchronized features for authenticated users.

## Core Principles

- **Uninterrupted Flow:** User actions should not cause unnecessary navigation. Ancillary actions (like starting a timer) happen in the background, while primary actions (like editing a task) occur in context, either through inline expansions or dialogs, keeping the user focused.
- **Context-Aware UI:** Controls and actions are relevant to the user's current view. For example, the primary action button changes depending on whether the user is managing tasks, flashcards, or overviews.
- **Local-First & Offline Capable:** Core features, like the Pomodoro timer, are available immediately without requiring a login or network connection. The application is a Progressive Web App (PWA), caching essential files for offline use after the first visit.

---

## Detailed Feature Documentation

This project is documented across several files to provide a comprehensive understanding of its features and architecture. To rebuild this application from scratch, refer to the following documents:

1.  **[Technical Architecture & Styling](./docs/architecture.md)**
    -   *Contents*: Tech Stack, Project Structure, State Management, Styling Philosophy, PWA configuration, and Internationalization (i18n).

2.  **[The Pomodoro Timer](./docs/pomodoro-timer.md)**
    -   *Contents*: Detailed logic for both the local-first (offline) and cloud-synced (authenticated) timers, state management, break system, and dynamic UI updates (tab title, favicon).

3.  **[Task Management System](./docs/task-management.md)**
    -   *Contents*: In-depth explanation of Task Types (Innie, Outie, Blackout), scheduling logic (including repeat frequencies), Silent Mode, Check-in Mode, filtering, and drag-and-drop functionality.

4.  **[Flashcard & Deck Management](./docs/flashcard-system.md)**
    -   *Contents*: Logic for rich content (Markdown, Mermaid, Markmaps), CRUD operations, batch creation, the Spaced Repetition System (SRS) algorithm, and flexible review modes.

5.  **[Overviews: High-Level Goal Tracking](./docs/overviews.md)**
    -   *Contents*: The purpose of Overviews, their relationship with tasks and flashcards, and the implementation of the integrated detail view.

---

This documentation provides the necessary blueprint to understand the application's design, logic, and implementation details, serving as a guide for maintenance, extension, or recreation.
