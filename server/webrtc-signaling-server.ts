import { WebSocketServer, WebSocket } from "ws"
import { v4 as uuidv4 } from "uuid"

const PORT = process.env.WEBRTC_SIGNALING_PORT || 3002
const wss = new WebSocketServer({ port: Number(PORT) })

// Simple session management: maps session ID to a set of WebSockets in that session
const sessions = new Map<string, Set<WebSocket>>()

console.info(`🚀 WebRTC Signaling Server started on port ${PORT}`)

wss.on("connection", (ws: WebSocket) => {
  const connectionId = uuidv4()
  let currentSessionId: string | null = null

  console.info(`[${connectionId}] Client connected.`)

  ws.on("message", (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString())
      const { type, payload } = data

      switch (type) {
        case "join-session":
          handleJoinSession(ws, payload.sessionId)
          break

        case "offer":
        case "answer":
        case "ice-candidate":
          broadcastToPeers(ws, type, payload)
          break

        default:
          console.warn(`[${connectionId}] Unknown message type: ${type}`)
          ws.send(JSON.stringify({ type: "error", payload: { message: "Unknown message type" } }))
      }
    } catch (error) {
      console.error(`[${connectionId}] Error processing message:`, error)
      ws.send(JSON.stringify({ type: "error", payload: { message: "Failed to process message" } }))
    }
  })

  ws.on("close", () => {
    handleClose()
  })

  ws.on("error", (error) => {
    console.error(`[${connectionId}] WebSocket error:`, error)
    handleClose()
  })

  function handleJoinSession(ws: WebSocket, sessionId: string) {
    currentSessionId = sessionId
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, new Set())
    }
    const sessionPeers = sessions.get(sessionId)!
    sessionPeers.add(ws)
    console.info(`[${connectionId}] Client joined session: ${sessionId}. Total clients in session: ${sessionPeers.size}`)

    // For a client-server model, we might not need to notify other peers.
    // But if it were peer-to-peer chat, this is where you'd notify others.
    // For now, we'll just confirm the join.
    ws.send(JSON.stringify({ type: "session-joined", payload: { success: true } }))

    // If there's another peer (the server-side process), it can now be signaled.
    // In this simple model, we assume the server is the other peer.
    // When a client joins, we can consider it ready for an offer.
  }

  function broadcastToPeers(senderWs: WebSocket, type: string, payload: any) {
    if (!currentSessionId) return

    const sessionPeers = sessions.get(currentSessionId)
    if (!sessionPeers) return

    console.info(`[${connectionId}] Broadcasting '${type}' to peers in session ${currentSessionId}`)

    sessionPeers.forEach((peerWs) => {
      // Broadcast to all peers except the sender
      if (peerWs !== senderWs && peerWs.readyState === WebSocket.OPEN) {
        peerWs.send(JSON.stringify({ type, payload, senderId: connectionId }))
      }
    })
  }

  function handleClose() {
    console.info(`[${connectionId}] Client disconnected.`)
    if (currentSessionId) {
      const sessionPeers = sessions.get(currentSessionId)
      if (sessionPeers) {
        sessionPeers.delete(ws)
        console.info(
          `[${connectionId}] Removed from session ${currentSessionId}. Remaining clients: ${sessionPeers.size}`,
        )

        if (sessionPeers.size === 0) {
          sessions.delete(currentSessionId)
          console.info(`Session ${currentSessionId} is empty and has been removed.`)
        } else {
          broadcastToPeers(ws, "peer-left", { peerId: connectionId })
        }
      }
    }
  }
})
