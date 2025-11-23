# FlashFlow

FlashFlow is a modern web application designed to enhance learning and productivity through a powerful combination of flashcards, task management, and the Pomodoro Technique. It provides a seamless, integrated workflow for users to define high-level goals, break them down into actionable tasks, create supporting study materials, and maintain focus using a built-in timer.

The application is architected to be "local-first," offering core functionality offline while providing enhanced, cloud-synchronized features for authenticated users.

## Core Principles

- **Uninterrupted Flow:** User actions should not cause unnecessary navigation. Ancillary actions (like starting a timer) happen in the background, while primary actions (like editing a task) occur in context, either through inline expansions or dialogs, keeping the user focused.
- **Context-Aware UI:** Controls and actions are relevant to the user's current view. For example, the primary action button changes depending on whether the user is managing tasks, flashcards, or overviews.
- **Local-First & Offline Capable:** Core features, like the Pomodoro timer, are available immediately without requiring a login or network connection. The application is a Progressive Web App (PWA), caching essential files for offline use after the first visit.

---

## Feature Overview

### 1. The Pomodoro Timer

The Pomodoro Timer is central to the FlashFlow experience, designed for reliability and seamless integration.

- **Local-First Timer:** A fully functional Pomodoro timer is available on the landing page for all users, with its state stored in the browser. It works offline and does not require an account.
- **Cloud-Synced Timer (Authenticated Users):** For logged-in users, the timer's state (including work and rest periods) is synchronized with Firestore. This ensures the timer continues accurately across devices, browser tabs, and even after screen locks.
- **Integrated Task Tracking:** When a timer is running, it can be associated with a specific task. Clicking the "Start Timer" button on a task will either begin a new session for that task or, if a session is already active, simply update the `currentTaskTitle` without interrupting the timer's countdown.
- **Smart Break System:** Upon completing a work session, users are prompted to choose from a list of curated break activities, each with descriptions of their benefits (e.g., stretching, meditation, deep breathing).
- **Dynamic Browser Tab & Favicon:** The browser tab title and favicon dynamically update to show the remaining time, providing at-a-glance status without needing the app to be in focus.

### 2. Task Management

The task management system is designed as a flexible list with a detailed, in-context editing panel.

- **Task Creation & Editing:** Tasks are created and edited in a sidebar panel, allowing the user to view their task list simultaneously.
- **Task Types:** Tasks can be categorized into three types:
  - **Innie:** Internal, focused work.
  - **Outie:** External-facing work (e.g., meetings, calls).
  - **Blackout:** Periods of intentional disconnection or rest.
- **Scheduling & Repetition:** Tasks can be scheduled with specific start/end dates, times, or date ranges. They support repeat frequencies (daily, weekly, etc.).
- **Silent Mode:** Future-dated tasks can be marked as "Silent," hiding them from the main list until their start date arrives.
- **Check-in Mode:** For habit-building, tasks can be configured to require a specific number of "check-ins" before they are marked complete.
- **Filtering & Drag-and-Drop:** The task list can be filtered by date range and type. On desktop, tasks can be dragged and dropped onto a type filter to quickly re-categorize them.
- **Artifact Linking:** Each task can be linked to multiple flashcards, providing quick access to relevant study materials directly from the task.

### 3. Flashcard & Deck Management

A comprehensive system for creating, organizing, and reviewing study materials.

- **Rich Content:** Flashcard fronts and backs support full Markdown, including complex content like **Mermaid diagrams** and **Markmaps (Mindmaps)**.
- **CRUD Operations:** Full Create, Read, Update, and Delete functionality for both individual flashcards and decks.
- **Batch Creation:** Efficiently create multiple flashcards at once by providing them in a simple `question:answer` text format.
- **Spaced Repetition System (SRS):**
  - Cards are automatically scheduled for future review based on performance (`Mastered`, `Later`, `Try Again`).
  - The review queue intelligently prioritizes cards that are due.
- **Flexible Review Modes:** Users can choose to review only cards that are currently due (Spaced Repetition) or review all cards in a deck or the entire collection.
- **Mindmap Visualization:** When viewing a card's answer, a "View Mindmap" button appears if the content is compatible, opening a fullscreen, interactive mindmap for better comprehension.
- **Audio Playback:** Text-to-speech functionality is available for both the front and back of a card.

### 4. Overviews: High-Level Goal Tracking

Overviews are a unique feature for defining high-level goals, principles, or areas of study, acting as containers for related tasks and flashcards.

- **Goal Definition:** Create overviews with a title and a detailed description (Markdown supported).
- **Task Association:** Link multiple tasks to an overview to break down a large goal into actionable steps.
- **Centralized Knowledge:** Link multiple flashcards directly to an overview, creating a central repository of reference material for a specific topic.
- **Integrated Detail View:** The overview detail page provides a unified dashboard showing the overview's description, all related flashcards, and an accordion-style list of pending and completed tasks, allowing for quick inline review without navigation.

---

## Technical Architecture & Style

- **Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, ShadCN UI Components.
- **Backend & Database:** Firebase Authentication and Firestore for user management and data persistence. All Firebase operations are client-side.
- **State Management:** React Context is used for managing global state related to Authentication, Flashcards/Tasks, and the Pomodoro timer.
- **PWA Enabled:** The application is configured as a Progressive Web App, enabling offline access and caching of essential resources.
- **Internationalization (i18n):** The UI is fully translated into English and Chinese, using `next-international`.
- **Styling:**
  - **Theme:** A clean, modern aesthetic with a defined color palette (deep purple primary, light gray background, soft pink accent).
  - **Dark Mode:** Fully supported.
  - **Layout:** UI is built with ShadCN components and styled with Tailwind CSS, following professional design patterns with rounded corners and shadows.
