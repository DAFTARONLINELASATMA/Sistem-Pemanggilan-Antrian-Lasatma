export type ServiceType = 'VISIT' | 'FOOD';

export interface CounterData {
  service: ServiceType;
  number: number;
  timestamp: string; // Used for animation/highlighting
}

export type CounterMap = Record<number, CounterData | null>;

export interface QueueState {
  currentNumber: number; // The highest number issued globally for this service
  lastCalled: string | null;
  totalServed: number;
  activeCounter: number | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isLoading?: boolean;
}

// Tipe pesan Request dari Panel Petugas ke TV (Server)
export type ClientRequest = 
  | { type: 'REQUEST_NEXT_VISIT'; payload: { counterId: number } }
  | { type: 'REQUEST_NEXT_FOOD'; payload: { counterId: number } }
  | { type: 'REQUEST_RECALL_VISIT'; payload: { counterId: number } }
  | { type: 'REQUEST_RECALL_FOOD'; payload: { counterId: number } }
  | { type: 'REQUEST_RESET_VISIT' }
  | { type: 'REQUEST_RESET_FOOD' }
  | { type: 'REQUEST_INITIAL_STATE' };

// Tipe pesan Sync dari TV ke semua Panel
export type ServerResponse = 
  | { type: 'SYNC_STATE'; payload: { visit: QueueState; food: QueueState; counters: CounterMap } };

export type BroadcastAction = ClientRequest | ServerResponse;
