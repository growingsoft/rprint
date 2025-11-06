import { WorkerModel } from '../models/WorkerModel';

export class Scheduler {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    // Check for offline workers every minute
    this.intervalId = setInterval(async () => {
      try {
        await WorkerModel.markOfflineWorkers(5);
      } catch (error) {
        console.error('Error checking worker status:', error);
      }
    }, 60000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const scheduler = new Scheduler();
