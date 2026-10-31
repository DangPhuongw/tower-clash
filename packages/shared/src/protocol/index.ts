export type GameMode = 'race' | 'sabotage' | 'coop' | 'practice';

/** Kết quả đánh giá của một lần thả khối (mục 3.3 và 7.4). */
export type DropResultType = 'perfect' | 'success' | 'miss' | 'collapse';

export interface DropResultMessage {
  playerId: string;
  result: DropResultType;
  score: number;
  floors: number;
  combo?: number;
}

export interface PingMessage {
  t: number;
}

export interface PongMessage {
  t: number;
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: number;
}
