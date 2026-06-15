import { secureStorage } from './secure-storage';

interface QueuedRequest {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body: any;
  headers: any;
  timestamp: number;
}

const QUEUE_KEY = 'offline_mutations_queue';

export const offlineQueue = {
  async getQueue(): Promise<QueuedRequest[]> {
    const raw = await secureStorage.getSecure(QUEUE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  async saveQueue(queue: QueuedRequest[]): Promise<void> {
    await secureStorage.setSecure(QUEUE_KEY, JSON.stringify(queue));
  },

  async enqueue(request: Omit<QueuedRequest, 'id' | 'timestamp'>): Promise<void> {
    const queue = await this.getQueue();
    const newRequest: QueuedRequest = {
      ...request,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: Date.now()
    };
    queue.push(newRequest);
    await this.saveQueue(queue);
    console.log('[OfflineQueue] Enqueued mutation request:', newRequest.url);
  },

  async dequeue(id: string): Promise<void> {
    let queue = await this.getQueue();
    queue = queue.filter(req => req.id !== id);
    await this.saveQueue(queue);
  },

  async processQueue(authToken?: string): Promise<void> {
    const queue = await this.getQueue();
    if (queue.length === 0) return;

    console.log(`[OfflineQueue] Processing ${queue.length} queued mutations...`);
    const { default: axios } = await import('axios');

    for (const req of queue) {
      try {
        const headers = {
          ...req.headers,
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        };
        
        await axios({
          url: req.url,
          method: req.method,
          data: req.body,
          headers
        });

        console.log('[OfflineQueue] Successfully processed mutation:', req.url);
        await this.dequeue(req.id);
      } catch (err) {
        console.error('[OfflineQueue] Failed to process queued request:', req.url, err);
        const status = (err as any).response?.status;
        if (status && status >= 400 && status < 500) {
          console.warn('[OfflineQueue] Dropping bad request from queue:', req.url);
          await this.dequeue(req.id);
        } else {
          break;
        }
      }
    }
  }
};
