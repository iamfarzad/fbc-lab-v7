export const MESSAGE_TYPES = {
  // Client -> Server
  START: 'start',
  STOP: 'stop',
  USER_AUDIO: 'user_audio',
  TOOL_RESULT: 'TOOL_RESULT',
  REALTIME_INPUT: 'REALTIME_INPUT',
  CONTEXT_UPDATE: 'CONTEXT_UPDATE',
  HEARTBEAT_ACK: 'heartbeat_ack',
  
  // Server -> Client
  CONNECTED: 'connected',
  START_ACK: 'start_ack',
  SESSION_STARTED: 'session_started',
  SESSION_CLOSED: 'session_closed',
  SETUP_COMPLETE: 'setup_complete',
  INPUT_TRANSCRIPT: 'input_transcript',
  OUTPUT_TRANSCRIPT: 'output_transcript',
  TEXT: 'text',
  AUDIO: 'audio',
  TURN_COMPLETE: 'turn_complete',
  TOOL_CALL: 'tool_call',
  ERROR: 'error',
  HEARTBEAT: 'heartbeat',
  STAGE_UPDATE: 'stage_update', // NEW
} as const;

export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];
