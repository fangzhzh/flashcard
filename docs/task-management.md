# Task Management System

The task management system in FlashFlow is designed to be a flexible and powerful tool for organizing work, integrated directly with the Pomodoro timer and flashcard system. The primary interface is the `TasksClient.tsx` component, which provides a two-panel layout on desktop: a list of tasks and a form for editing or creating a task.

## 1. Task Data Model

A task is represented by the `Task` interface, which includes the following key fields:

```typescript
interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'completed';
  type: 'innie' | 'outie' | 'blackout';
  overviewId?: string | null;
  repeat: 'none' | 'daily' | 'weekly' | ...;
  isSilent?: boolean;
  timeInfo: TimeInfo;
  artifactLink: ArtifactLink;
  reminderInfo: ReminderInfo;
  checkinInfo?: CheckinInfo | null;
  createdAt: any;
  updatedAt: any;
}
```

## 2. Core Features & Implementation

### a. Task Types

Tasks can be categorized into three types, allowing users to organize their work based on focus.

-   **Innie**: Internal, focused work (e.g., writing, coding, studying).
-   **Outie**: External-facing work (e.g., meetings, calls, presentations).
-   **Blackout**: Periods of intentional disconnection or rest.

The `TasksClient` UI includes a sidebar filter that allows users to view tasks of a specific type or all types.

### b. Scheduling, Repetition, and Time

-   **Component**: `TaskDateTimeReminderDialog.tsx`
-   **Logic**: Task timing is configured through a dedicated dialog that allows users to set:
    -   **Start/End Dates**: A task can have a specific start date, or a date range.
    -   **Time**: An optional start time can be added for `datetime` type events.
    -   **Repetition**: The `repeat` property determines if a task reoccurs. When a repeating task is marked as complete, a new task is automatically created for the next occurrence. The `calculateNextOccurrence` function in `TasksClient.tsx` contains the logic for determining the next date based on the frequency (`daily`, `weekly`, `weekday`, etc.). The newly created task is marked as `isSilent: true`.
    -   **Reminders**: Users can configure reminders, although the notification delivery mechanism for these is a future implementation.

### c. Silent Mode

-   **Field**: `isSilent: boolean`
-   **Logic**:
    -   If `isSilent` is `true`, the task will **not** appear in the main task list until its `startDate` is reached.
    -   This is primarily used for recurring tasks. When a recurring task is completed, its successor is created with `isSilent: true` to prevent cluttering the user's view with future obligations.
    -   It can also be manually set by the user in the `TaskForm` for any future-dated task.

### d. Check-in Mode

-   **Field**: `checkinInfo: CheckinInfo | null`
    ```typescript
    interface CheckinInfo {
      totalCheckinsRequired: number;
      currentCheckins: number;
      history: string[]; // Array of ISO date strings for each check-in
    }
    ```
-   **UI**: When check-in mode is enabled for a task, the standard completion checkbox is replaced with a "Stamp" button.
-   **Logic**:
    1.  Clicking the stamp calls `handleCheckIn()`.
    2.  This function increments `currentCheckins` and adds a timestamp to the `history` array.
    3.  If `currentCheckins` equals `totalCheckinsRequired`, the task's `status` is automatically set to `completed`.
    4.  If the completed task is also a repeating task, the logic for creating the next occurrence is triggered.
-   **Use Case**: Ideal for habit-building or tasks that require multiple sessions to complete (e.g., "Read 5 chapters of a book").

### e. Filtering & Drag-and-Drop

-   **Date Filtering**: The UI provides tabs to filter tasks by their time frame: "All", "Today", "3 Days", "This Week", and "Two Weeks". The filtering logic (`filteredAndSortedTasks`) correctly handles tasks that are single-day events versus those that span a date range, showing any task that overlaps with the selected filter period.
-   **Type Filtering (Drag-and-Drop)**:
    -   On desktop, the task type filter buttons in the sidebar are drop targets.
    -   Users can drag a task item from the list and drop it onto a type filter (e.g., drop a task on the "Outie" filter).
    -   The `handleDropOnType` function captures the `taskId` from the drag event's data transfer and the `newType` from the drop target.
    -   It then calls `updateTask` to instantly re-categorize the task, providing a fast and intuitive way to organize tasks.

### f. Artifact Linking (Flashcards)

-   **Field**: `artifactLink: { flashcardIds?: string[] | null }`
-   **UI**: The `TaskForm` includes a section for managing linked flashcards.
-   **Functionality**:
    -   **Create & Link**: Users can create a new flashcard directly from the task form. Upon creation, the new flashcard's ID is added to the task's `flashcardIds` array.
    -   **Select & Link**: Users can open a dialog to search and select from their existing flashcards to link to the task.
    -   **View & Manage**: The form displays a list of linked flashcards. Users can edit a linked card (which opens another dialog) or remove the link.
-   **Benefit**: This creates a powerful connection between study materials and actionable to-dos, allowing users to associate specific knowledge with the tasks that require it.
