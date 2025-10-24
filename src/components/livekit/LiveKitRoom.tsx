'use client'

import { useEffect, useState } from 'react'
import { Room, RoomEvent, RemoteParticipant, LocalParticipant } from 'livekit-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface LiveKitRoomProps {
  roomName: string
  token: string
  serverUrl: string
}

export function LiveKitRoom({ roomName, token, serverUrl }: LiveKitRoomProps) {
  const [room, setRoom] = useState<Room | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [participants, setParticipants] = useState<RemoteParticipant[]>([])
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const connectToRoom = async () => {
      try {
        const newRoom = new Room()
        
        newRoom.on(RoomEvent.Connected, () => {
          console.log('Connected to room')
          setIsConnected(true)
          setLocalParticipant(newRoom.localParticipant)
        })

        newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          console.log('Participant connected:', participant.identity)
          setParticipants(prev => [...prev, participant])
        })

        newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          console.log('Participant disconnected:', participant.identity)
          setParticipants(prev => prev.filter(p => p.identity !== participant.identity))
        })

        newRoom.on(RoomEvent.Disconnected, () => {
          console.log('Disconnected from room')
          setIsConnected(false)
          setLocalParticipant(null)
          setParticipants([])
        })

        await newRoom.connect(serverUrl, token)
        setRoom(newRoom)
      } catch (err) {
        console.error('Failed to connect to room:', err)
        setError(err instanceof Error ? err.message : 'Failed to connect to room')
      }
    }

    connectToRoom()

    return () => {
      if (room) {
        room.disconnect()
      }
    }
  }, [roomName, token, serverUrl])

  const disconnect = () => {
    if (room) {
      room.disconnect()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>LiveKit Room</CardTitle>
        <CardDescription>
          Room: {roomName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          {localParticipant && (
            <Badge variant="outline">
              Local: {localParticipant.identity}
            </Badge>
          )}
        </div>

        {participants.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Participants ({participants.length})</h4>
            <div className="space-y-1">
              {participants.map((participant) => (
                <div key={participant.identity} className="flex items-center gap-2">
                  <Badge variant="outline">{participant.identity}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {participant.isSpeaking ? "Speaking" : "Silent"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          {isConnected ? (
            <Button onClick={disconnect} variant="destructive">
              Disconnect
            </Button>
          ) : (
            <Button disabled>
              Connecting...
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
