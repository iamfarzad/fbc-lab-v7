export type LiveServerEvent =
  | { type: 'connected'; payload: { connectionId: string } }
  | { type: 'session_started'; payload: { connectionId: string; languageCode?: string; voiceName?: string; mock?: boolean } }
  | { type: 'session_closed'; payload?: { reason?: string } }
  | { type: 'input_transcript'; payload: { text: string; isFinal?: boolean } }
  | { type: 'output_transcript'; payload: { text: string; isFinal?: boolean } }
  | { type: 'model_text'; payload: { text: string } }
  | { type: 'text'; payload: { content: string } }
  | { type: 'audio'; payload: { audioData: string; mimeType?: string } }
  | { type: 'heartbeat'; payload?: { timestamp: number } }
  | { type: 'turn_complete'; payload?: { turnComplete?: boolean } }
  | { type: 'setup_complete'; payload: { setupComplete: boolean } }
  | { type: 'interrupted'; payload: { interrupted: boolean } }
  | { type: 'tool_call'; payload: any }
  | { type: 'tool_result'; payload: any }
  | { type: 'tool_call_cancellation'; payload: any }
  | { type: 'stage_update'; payload: { stage: string; agent: string; flow?: any } }
  | { type: 'error'; payload: { message: string; detail?: unknown } }

export type LiveClientEventMap = {
  open: () => void
  close: (reason?: string) => void
  error: (message: string) => void
  connected: (connectionId: string) => void
  session_started: (data: { connectionId: string; languageCode?: string; voiceName?: string }) => void
  session_closed: (reason?: string) => void
  input_transcript: (text: string, isFinal: boolean) => void
  output_transcript: (text: string, isFinal: boolean) => void
  text: (content: string) => void
  audio: (base64Pcm16: string, mimeType?: string) => void
  turn_complete: () => void
  setup_complete: () => void
  interrupted: () => void
  tool_call: (payload: any) => void
  tool_result: (payload: any) => void
  stage_update: (payload: { stage: string; agent: string; flow?: any }) => void
}

