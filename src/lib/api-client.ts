export class ApiClient {
  private apiBase: string;

  constructor(private getToken: () => Promise<string | null>) {
    this.apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const token = await this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.apiBase}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.message) {
          errorMessage = typeof errJson.message === 'string' ? errJson.message : JSON.stringify(errJson.message);
        } else if (errJson && errJson.error) {
          errorMessage = errJson.error;
        }
      } catch (_) {}
      throw new Error(errorMessage);
    }

    // Handlers for DELETE / Empty responses
    if (response.status === 204) {
      return {} as T;
    }

    try {
      return await response.json() as T;
    } catch (e) {
      return {} as T;
    }
  }

  // --- Flashcards ---
  async getFlashcards(deckId?: string): Promise<any[]> {
    const query = deckId ? `?deckId=${encodeURIComponent(deckId)}` : '';
    return this.request<any[]>('GET', `/flashcards${query}`);
  }

  async createFlashcard(card: any): Promise<any> {
    return this.request<any>('POST', '/flashcards', card);
  }

  async createFlashcardsBatch(cards: any[]): Promise<any[]> {
    return this.request<any[]>('POST', '/flashcards/batch', { cards });
  }

  async updateFlashcard(id: string, card: any): Promise<any> {
    return this.request<any>('PATCH', `/flashcards/${id}`, card);
  }

  async deleteFlashcard(id: string): Promise<any> {
    return this.request<any>('DELETE', `/flashcards/${id}`);
  }

  // --- Decks ---
  async getDecks(): Promise<any[]> {
    return this.request<any[]>('GET', '/decks');
  }

  async createDeck(deck: any): Promise<any> {
    return this.request<any>('POST', '/decks', deck);
  }

  async updateDeck(id: string, deck: any): Promise<any> {
    return this.request<any>('PATCH', `/decks/${id}`, deck);
  }

  async deleteDeck(id: string): Promise<any> {
    return this.request<any>('DELETE', `/decks/${id}`);
  }

  // --- Tasks ---
  async getTasks(): Promise<any[]> {
    return this.request<any[]>('GET', '/tasks');
  }

  async createTask(task: any): Promise<any> {
    return this.request<any>('POST', '/tasks', task);
  }

  async updateTask(id: string, task: any): Promise<any> {
    return this.request<any>('PATCH', `/tasks/${id}`, task);
  }

  async deleteTask(id: string): Promise<any> {
    return this.request<any>('DELETE', `/tasks/${id}`);
  }

  async checkinTask(id: string): Promise<any> {
    return this.request<any>('POST', `/tasks/${id}/checkin`);
  }

  // --- Overviews ---
  async getOverviews(): Promise<any[]> {
    return this.request<any[]>('GET', '/overviews');
  }

  async getOverview(id: string): Promise<any> {
    return this.request<any>('GET', `/overviews/${id}`);
  }

  async createOverview(overview: any): Promise<any> {
    return this.request<any>('POST', '/overviews', overview);
  }

  async updateOverview(id: string, overview: any): Promise<any> {
    return this.request<any>('PATCH', `/overviews/${id}`, overview);
  }

  async deleteOverview(id: string): Promise<any> {
    return this.request<any>('DELETE', `/overviews/${id}`);
  }

  // --- Pomodoro ---
  async getPomodoro(): Promise<any> {
    return this.request<any>('GET', '/pomodoro');
  }

  async updatePomodoro(state: any): Promise<any> {
    return this.request<any>('PUT', '/pomodoro', state);
  }

  // --- AI ---
  async decompose(cards: any[]): Promise<any> {
    return this.request<any>('POST', '/ai/decompose', { cards });
  }

  async githubReview(variation?: number): Promise<any> {
    return this.request<any>('POST', '/ai/github-review', { variation });
  }

  // --- Concurrency ---
  async getConcurrencyChallenges(): Promise<any[]> {
    return this.request<any[]>('GET', '/concurrency/challenges');
  }

  async verifyConcurrencyCode(challengeId: string, levelId: string, code: string): Promise<any> {
    return this.request<any>('POST', '/concurrency/verify', { challengeId, levelId, code });
  }
}
