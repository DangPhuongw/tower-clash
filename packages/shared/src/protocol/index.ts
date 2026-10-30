export type GameMode = 'race' | 'sabotage' | 'coop' | 'practice';

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
