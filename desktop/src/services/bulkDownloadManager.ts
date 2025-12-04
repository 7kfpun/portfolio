import { historicalDataService } from './historicalDataService';

const DOWNLOAD_DELAY_MS = 10_000;

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export interface BulkDownloadState {
  running: boolean;
  total: number;
  completed: number;
  currentTicker: string | null;
  nextTicker: string | null;
  queue: string[];
  stopped: boolean;
}

type Listener = (state: BulkDownloadState) => void;

const initialState: BulkDownloadState = {
  running: false,
  total: 0,
  completed: 0,
  currentTicker: null,
  nextTicker: null,
  queue: [],
  stopped: false,
};

class BulkDownloadManager {
  private state: BulkDownloadState = initialState;
  private listeners = new Set<Listener>();
  private clearTimer: ReturnType<typeof setTimeout> | null = null;
  private task: Promise<void> | null = null;
  private stopRequested = false;
  private cancelDelay: (() => void) | null = null;

  getState(): BulkDownloadState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async start(tickers: string[]): Promise<void> {
    if (tickers.length === 0 || this.state.running) {
      return;
    }

    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }

    this.stopRequested = false;
    this.task = this.runQueue(tickers);
    await this.task;
  }

  stop(): void {
    if (!this.state.running) {
      return;
    }
    this.stopRequested = true;
    if (this.cancelDelay) {
      this.cancelDelay();
      this.cancelDelay = null;
    }
  }

  private async runQueue(tickers: string[]) {
    this.updateState({
      running: true,
      total: tickers.length,
      completed: 0,
      currentTicker: null,
      nextTicker: tickers[0] ?? null,
      queue: [...tickers],
      stopped: false,
    });

    for (let i = 0; i < tickers.length; i += 1) {
      if (this.stopRequested) {
        break;
      }
      const ticker = tickers[i];
      this.updateState({
        completed: i,
        currentTicker: ticker,
        nextTicker: tickers[i + 1] ?? null,
      });

      try {
        await historicalDataService.downloadHistoricalData([ticker]);
      } catch (error) {
        console.error(`Failed to download ticker ${ticker}:`, error);
      }

      this.updateState({ completed: i + 1 });

      if (this.stopRequested) {
        break;
      }

      if (i < tickers.length - 1) {
        await this.waitWithStop(DOWNLOAD_DELAY_MS);
        if (this.stopRequested) {
          break;
        }
      }
    }

    const stopped = this.stopRequested;
    this.updateState({
      running: false,
      currentTicker: null,
      nextTicker: null,
      stopped,
    });
    this.stopRequested = false;
    this.scheduleReset();
  }

  private async waitWithStop(duration: number) {
    await new Promise<void>(resolve => {
      const timeout = setTimeout(() => {
        this.cancelDelay = null;
        resolve();
      }, duration);
      this.cancelDelay = () => {
        clearTimeout(timeout);
        this.cancelDelay = null;
        resolve();
      };
    });
  }

  private updateState(partial: Partial<BulkDownloadState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(listener => listener(this.state));
  }

  private scheduleReset() {
    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
    }
    this.clearTimer = setTimeout(() => {
      this.state = initialState;
      this.stopRequested = false;
      this.listeners.forEach(listener => listener(this.state));
      this.clearTimer = null;
    }, 3000);
  }
}

export const bulkDownloadManager = new BulkDownloadManager();
