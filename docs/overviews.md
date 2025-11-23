# Overviews: High-Level Goal Tracking

Overviews are a unique feature in FlashFlow designed to help users define and track high-level goals, principles, or broad areas of study. They act as containers, creating a unified dashboard that links strategic objectives to the tactical tasks and knowledge required to achieve them.

## 1. The Purpose of Overviews

While tasks are granular to-dos and flashcards are discrete pieces of information, Overviews provide the "big picture." They answer the question, "Why am I doing these tasks and learning these things?"

**Use Cases:**

-   **Academic Study**: An overview for "Master Calculus I" could link to tasks like "Complete Chapter 3 Problem Set" and "Prepare for Midterm Exam," as well as flashcards for key theorems and formulas.
-   **Project Management**: An overview for "Launch New Product" could link to tasks for market research, development, and marketing, and flashcards for competitor analysis and key feature specs.
-   **Personal Development**: An overview for "Learn to Cook Italian Food" could link to tasks like "Master Fresh Pasta" and "Perfect a Ragu," and flashcards for mother sauce recipes.

## 2. Data Model & Relationships

The `Overview` data model is central to this feature.

```typescript
interface Overview {
  id: string;
  userId: string;
  title: string;
  description?: string | null; // Supports Markdown
  artifactLink?: ArtifactLink; // Links to flashcards
  createdAt: string;
  updatedAt: string;
}

// An overview can link to multiple flashcards
interface ArtifactLink {
  flashcardIds?: string[] | null;
}

// Tasks link back to an overview
interface Task {
  // ... other task properties
  overviewId?: string | null;
}
```

-   An **Overview** can be directly linked to multiple **Flashcards** via its `artifactLink.flashcardIds` array.
-   Multiple **Tasks** can be linked to a single **Overview** via their `overviewId` property.

## 3. UI and User Flow

### a. Overview List (`OverviewsClient.tsx`)

-   This is the main entry point for the feature, displaying a grid of all created overviews.
-   Each overview card shows its title, a snippet of the description, and a count of how many tasks are linked to it.
-   Users can create, edit, or delete overviews from this page.
-   The "Edit Overview" dialog allows users to manage the overview's title, description, and its directly linked flashcards.

### b. Overview Detail View (`OverviewDetailClient.tsx`)

This is the core dashboard for a single overview, providing a unified view of all related items. It is designed to prevent unnecessary navigation.

-   **Description Display**: The overview's full Markdown-enabled description is displayed at the top.
-   **Related Flashcards**: A collapsible section (`<Accordion>`) shows all flashcards related to this overview. This includes cards linked *directly* to the overview **and** cards linked to any of the tasks associated with the overview. This provides a complete knowledge base for the goal.
-   **Linked Tasks (Accordion)**: The primary feature of this page is the in-place expandable list of tasks.
    -   **Pending Tasks**: All `pending` tasks linked to the overview are displayed in an accordion.
    -   **Completed Tasks**: A separate accordion section displays `completed` tasks. This section includes a filter to view tasks completed within the last week, two weeks, month, or a custom time frame. The filter correctly uses the task's `updatedAt` timestamp to determine its completion date.
    -   **Inline Expansion**: Clicking on any task in either list expands it in-place. The expanded view shows the task's full description and a simplified, read-only view of its linked flashcard (if any). This allows the user to quickly review details without leaving the context of the overview.
    -   An "Edit Task" button within the expanded view allows the user to navigate to the full task form if modifications are needed.
-   **Contextual Actions**: Buttons are provided to "Add Task to this Overview," which navigates to the task creation form with the `overviewId` pre-filled.
