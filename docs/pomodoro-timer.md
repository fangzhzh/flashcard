# The Pomodoro Timer

The Pomodoro Timer is a central feature of FlashFlow, designed for reliability, seamless integration with tasks, and both online and offline use. The implementation is split into two distinct contexts to handle authenticated and unauthenticated users.

## 1. Core Logic & Dual Implementation

### a. Local-First Timer (Unauthenticated Users)

-   **Component**: `PomodoroLocalClient.tsx`
-   **Context**: `PomodoroLocalContext.tsx`
-   **Functionality**:
    -   Displayed on the main landing page (`/`) for any user who is not logged in.
    -   The timer's state (status, time left, user preferences) is managed entirely within React state (`useState`, `useRef`) and does **not** persist across page reloads.
    -   It is fully functional offline after the initial page load, as it has no external dependencies.
    -   When a work session completes, it triggers the `BreakOptionsDialog` to allow the user to choose a break activity.

### b. Cloud-Synced Timer (Authenticated Users)

-   **Component**: `PomodoroClient.tsx`
-   **Context**: `PomodoroContext.tsx`
-   **Functionality**:
    -   Accessible to logged-in users, primarily on the `/timer` page and via the floating timer button.
    -   The entire state of the timer is stored in a single document in **Firestore** at the path `/users/{userId}/pomodoro/state`.
    -   **Real-time Synchronization**: The `PomodoroContext` uses an `onSnapshot` listener to subscribe to changes in the Firestore document. This ensures that the timer's state is consistent across all devices, browser tabs, and sessions. If a user starts a timer on their desktop and then opens the app on their phone, the phone will show the correct time remaining.
    -   **Server-Driven Timers**: Both the work and rest timers are driven by a `targetEndTime` stored on the server. The client-side logic simply calculates the difference between the current time and the `targetEndTime`. This makes the timer resilient to screen locks, page reloads, and network interruptions.

## 2. State Management & Data Model

The state for the cloud-synced timer is stored in a `PomodoroSessionState` object in Firestore:

```typescript
interface PomodoroSessionState {
  userId: string;
  status: 'running' | 'paused' | 'idle';
  targetEndTime: number | null; // Timestamp (ms) for when the work session ends
  restTargetEndTime: number | null; // Timestamp (ms) for when the rest session ends
  pausedTimeLeftSeconds: number | null; // Stores remaining time when paused
  currentSessionInitialDurationMinutes: number;
  userPreferredDurationMinutes: number;
  userPreferredRestDurationMinutes: number;
  notes: string;
  currentTaskTitle: string | null;
  updatedAt: any; // Firestore Server Timestamp
}
```

## 3. Key Features & Implementation Details

### a. Integrated Task Tracking

-   **Location**: `TasksClient.tsx`
-   **Logic**: The "Start Pomodoro" button on each task item has smart logic:
    1.  If no timer is currently active (`idle` state), it calls `startPomodoro()`, passing the task's title and the user's preferred duration.
    2.  If a timer is already `running` or `paused`, it does **not** restart the timer. Instead, it calls `updateCurrentTaskTitle()`, which updates the `currentTaskTitle` field in the Firestore document.
-   **Benefit**: This allows users to seamlessly switch the task they are focusing on mid-session without interrupting their Pomodoro flow.

### b. Smart Break System

-   **Component**: `BreakOptionsDialog.tsx`
-   **Trigger**: The `PomodoroContext` and `PomodoroLocalContext` both set `isBreakDialogOpen` to `true` when a work session's timer reaches zero.
-   **Functionality**:
    -   The dialog presents a curated list of break activities (e.g., stretching, deep breathing).
    -   Each option displays a star rating for effectiveness and provides a tooltip with a description of its benefits.
    -   When the user selects an option and clicks "Start Rest," the `handleStartRestPeriod` function is called.
    -   For the cloud-synced timer, this function calculates a `restTargetEndTime` and saves it to Firestore, officially beginning the server-driven rest period.

### c. Dynamic Browser Tab & Favicon

-   **Location**: `PomodoroContext.tsx` and `PomodoroLocalContext.tsx` within a `useEffect` hook.
-   **Logic**:
    1.  The `useEffect` hook tracks changes in `timeLeftSeconds`, `restTimeLeftSeconds`, `isResting`, and `status`.
    2.  It constructs a `titlePrefix` (e.g., "⏲️ ", "🧘 ") based on the current state.
    3.  It updates `document.title` to include the prefix and the formatted time remaining.
    4.  It calls `updateFaviconWithTime()`, a utility function that dynamically draws the remaining minutes onto an HTML `<canvas>` element.
    5.  The canvas is then converted to a data URI and set as the `href` of the page's favicon link element.
    6.  The color of the favicon's background circle changes to the accent color during a rest period.
    7.  When the timer is idle, the title and favicon are reset to their original values.
-   **Benefit**: Provides at-a-glance status of the timer without requiring the user to have the application tab in focus.
