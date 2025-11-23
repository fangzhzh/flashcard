# Technical Architecture & Styling

This document outlines the technical foundation of the FlashFlow application, including the technology stack, project structure, state management strategy, and styling philosophy.

## 1. Technology Stack

-   **Framework**: [Next.js](https://nextjs.org/) 14 with the **App Router**. This provides server-side rendering, static site generation, and a robust file-based routing system. Server Components are used by default to minimize client-side JavaScript.
-   **Language**: [TypeScript](https://www.typescriptlang.org/). All code is strongly typed to ensure code quality, maintainability, and developer productivity.
-   **UI Library**: [React](https://reactjs.org/) 18. Used for building the user interface with functional components and hooks.
-   **Component Library**: [ShadCN UI](https://ui.shadcn.com/). A collection of beautifully designed, accessible, and composable components built on top of Radix UI and Tailwind CSS.
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/). A utility-first CSS framework for rapid UI development. All styling is done via utility classes, with a centralized theme defined in `src/app/globals.css`.
-   **Backend & Database**:
    -   [Firebase Authentication](https://firebase.google.com/docs/auth): For user management, supporting both email/password and Google OAuth providers.
    -   [Cloud Firestore](https://firebase.google.com/docs/firestore): A NoSQL document database used for all data persistence for authenticated users, including tasks, flashcards, decks, and Pomodoro state.
-   **State Management**: [React Context](https://react.dev/reference/react/useContext). Used for managing global state across the application, separated into logical domains (Auth, Flashcards/Tasks, Pomodoro).
-   **Internationalization (i18n)**: [next-international](https://github.com/QuiiBz/next-international). A library for providing full i18n support, with translations managed in `src/lib/i18n/locales/`.
-   **Progressive Web App (PWA)**: [`@ducanh2912/next-pwa`](https://www.npmjs.com/package/@ducanh2912/next-pwa). Configured to make the application installable and enable offline functionality by caching essential assets.

## 2. Project Structure

The project follows a standard Next.js App Router structure:

```
src
├── app
│   ├── [locale]                # Handles internationalized routes
│   │   ├── (pages)             # Route groups for different sections
│   │   │   ├── page.tsx        # Main landing page
│   │   │   ├── tasks           # Task management view
│   │   │   ├── flashcards      # Flashcard management view
│   │   │   ├── decks           # Deck management view
│   │   │   ├── review          # Review mode view
│   │   │   ├── timer           # Authenticated Pomodoro timer view
│   │   │   └── overviews       # Overviews management view
│   │   ├── layout.tsx          # Root layout for the locale
│   │   └── globals.css         # Global styles and Tailwind theme variables
│   ├── layout.tsx              # Root application layout
│   └── ...
├── components
│   ├── ui                      # ShadCN UI components
│   ├── Header.tsx              # Main application header
│   ├── PageContainer.tsx       # Standard page wrapper
│   ├── TaskForm.tsx            # Form for creating/editing tasks
│   └── ...                     # Other reusable components
├── contexts
│   ├── AuthContext.tsx         # Manages user authentication state
│   ├── FlashcardsContext.tsx   # Manages all data (flashcards, decks, tasks, overviews)
│   ├── PomodoroContext.tsx     # Manages cloud-synced Pomodoro state
│   └── PomodoroLocalContext.tsx # Manages local-first Pomodoro state
├── hooks
│   └── use-toast.ts            # Custom hook for displaying notifications
├── lib
│   ├── firebase.ts             # Firebase initialization and configuration
│   ├── i18n                    # Internationalization setup and locales
│   └── utils.ts                # Utility functions (e.g., `cn` for Tailwind)
├── types
│   └── index.ts                # TypeScript type definitions for all data models
└── middleware.ts               # Handles i18n routing
```

## 3. State Management

Global state is managed via React Context to avoid prop-drilling and provide a clean separation of concerns.

-   **`AuthContext`**: Handles user session state, provides `signIn`, `signOut`, and `signUp` methods, and exposes the current `user` object.
-   **`FlashcardsContext`**: Acts as the primary data layer for authenticated users. It fetches and caches all flashcards, decks, tasks, and overviews from Firestore, providing real-time updates and methods for all CRUD (Create, Read, Update, Delete) operations. This centralizes data fetching and mutation logic.
-   **`PomodoroContext`**: Manages the state of the cloud-synced Pomodoro timer for authenticated users. It listens to Firestore for real-time state changes, ensuring the timer is consistent across devices.
-   **`PomodoroLocalContext`**: Manages the state of the local-first Pomodoro timer for unauthenticated users. All state is stored within the React component and does not persist beyond a page refresh.

## 4. Styling & UI/UX

The application's design is guided by a "clean and modern" aesthetic.

-   **Color Palette**: Defined in `src/app/globals.css` using HSL CSS variables for easy theming.
    -   **Primary**: A deep, muted purple (`#7E57C2`) for key actions and highlights.
    -   **Background**: A light gray (`#F5F5F5`) for the main application background.
    -   **Accent**: A soft, warm pink (`#F48FB1`) for secondary highlights, such as the rest timer.
    -   **Dark Mode**: A full dark mode theme is supported, using inverted and adjusted colors for a comfortable viewing experience in low light.
-   **Component Styling**:
    -   All components are built using **ShadCN UI**.
    -   Spacing, layout, and fine-tuning are achieved with **Tailwind CSS** utility classes.
    -   Components feature rounded corners (`--radius: 0.5rem`) and subtle shadows to create depth and a professional feel.
-   **Layout**: The application uses a main content area with a persistent `Header`. Key actions are often handled by a `UniversalFab` (Floating Action Button) that provides context-aware actions, or through dialogs (`<Dialog>`) and inline expansions (`<Accordion>`) to prevent unnecessary navigation and maintain user flow.

## 5. PWA & Offline Functionality

The application is configured as a Progressive Web App (PWA) using `@ducanh2912/next-pwa`.

-   **Service Worker**: A service worker is registered to cache all essential static assets (`.js`, `.css`, fonts, etc.) after the first visit.
-   **Offline Access**: Because assets are cached, the application can be loaded even without an internet connection. This is critical for the **local-first Pomodoro timer**, which is designed to function entirely offline on the landing page for unauthenticated users. Authenticated features requiring database access will gracefully handle the offline state (e.g., by disabling actions or showing loading indicators).
-   **Installability**: The PWA configuration includes a `manifest.json`, allowing users to "install" the application to their home screen on mobile devices or as a desktop app for a more native experience.
