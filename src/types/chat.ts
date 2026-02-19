export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
}

export interface ProgressStep {
  tool: string | null;
  file: string | null;
  action: string | null;
  status: 'running' | 'completed' | 'error';
  content: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

export interface ChatState {
  messages: Message[];
}

export interface PoolStatus {
  active: number;
  queued: number;
  max_workers: number;
}
