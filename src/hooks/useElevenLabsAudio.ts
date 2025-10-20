import { useLiveApi } from '@/hooks/useLiveApi'
import { useState, useEffect, useRef } from 'react'

export interface ElevenLabsAudioData {
  levels: number[]
  volume: number
  frequencyData: number[]
  isActive: boolean
}

export function useElevenLabsAudio(isActive: boolean): ElevenLabsAudioData {
  const [levels, setLevels] = useState<number[]>(Array(12).fill(0))
  const [volume, setVolume] = useState(0)
  const frameIdRef = useRef<number>()
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  
  const liveApi = useLiveApi()
  
  useEffect(() => {
    if (!isActive || !liveApi.micStream) {
      setLevels(Array(12).fill(0))
      setVolume(0)
      
      // Cleanup analyzer
      if (analyserRef.current) {
        analyserRef.current.disconnect()
        analyserRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      return
    }
    
    // Create audio analyzer for real audio data
    try {
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(liveApi.micStream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      analyserRef.current.smoothingTimeConstant = 0.8
      source.connect(analyserRef.current)
      
      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      const updateAudioData = () => {
        if (!analyserRef.current) return
        
        analyserRef.current.getByteFrequencyData(dataArray)
        
        // Extract 12 frequency bands (bass to treble)
        const bandsCount = 12
        const samplesPerBand = Math.floor(bufferLength / bandsCount)
        const bandLevels = Array(bandsCount).fill(0).map((_, i) => {
          const start = i * samplesPerBand
          const end = start + samplesPerBand
          const bandData = dataArray.slice(start, end)
          const avg = bandData.reduce((sum, val) => sum + val, 0) / bandData.length
          return avg / 255 // Normalize to 0-1
        })
        
        setLevels(bandLevels)
        
        // Calculate overall volume
        const avgVolume = bandLevels.reduce((sum, level) => sum + level, 0) / bandLevels.length
        setVolume(avgVolume)
        
        frameIdRef.current = requestAnimationFrame(updateAudioData)
      }
      
      frameIdRef.current = requestAnimationFrame(updateAudioData)
    } catch (error) {
      console.error('Failed to create audio analyzer:', error)
    }
    
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect()
        analyserRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [isActive, liveApi.micStream])
  
  return { 
    levels, 
    volume,
    frequencyData: levels.map(level => level * 255), // Convert back to 0-255 range
    isActive
  }
}

// Hook for simulated audio data (useful for demos and testing)
export function useSimulatedAudio(isActive: boolean, interval: number = 50): ElevenLabsAudioData {
  const [levels, setLevels] = useState<number[]>(Array(12).fill(0))
  const [volume, setVolume] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout>()
  
  useEffect(() => {
    if (!isActive) {
      setLevels(Array(12).fill(0))
      setVolume(0)
      return
    }
    
    const updateSimulatedData = () => {
      // Generate realistic audio-like data
      const newLevels = Array(12).fill(0).map((_, i) => {
        // Create frequency-like distribution (lower frequencies more active)
        const frequencyWeight = Math.max(0, 1 - (i / 12))
        const randomFactor = Math.random()
        return Math.min(1, frequencyWeight * randomFactor * 0.8)
      })
      
      setLevels(newLevels)
      
      // Calculate volume from levels
      const avgVolume = newLevels.reduce((sum, level) => sum + level, 0) / newLevels.length
      setVolume(avgVolume)
    }
    
    intervalRef.current = setInterval(updateSimulatedData, interval)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isActive, interval])
  
  return {
    levels,
    volume,
    frequencyData: levels.map(level => level * 255), // Convert back to 0-255 range
    isActive
  }
}
