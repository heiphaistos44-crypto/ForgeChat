import { useEffect, useRef, useState } from 'react'

const SPEAKING_THRESHOLD = 18
const SAMPLE_INTERVAL = 80

export function useVoiceActivity(stream: MediaStream | null, enabled = true): boolean {
  const [speaking, setSpeaking] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!stream || !enabled) {
      setSpeaking(false)
      return
    }

    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length === 0) return

    try {
      const ctx = new AudioContext()
      ctxRef.current = ctx

      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.3
      source.connect(analyser)

      const data = new Uint8Array(analyser.frequencyBinCount)

      timerRef.current = setInterval(() => {
        analyser.getByteFrequencyData(data)
        const avg = data.slice(0, data.length / 2).reduce((a, b) => a + b, 0) / (data.length / 2)
        setSpeaking(avg > SPEAKING_THRESHOLD)
      }, SAMPLE_INTERVAL)

      return () => {
        clearInterval(timerRef.current!)
        ctx.close()
        setSpeaking(false)
      }
    } catch {
      // AudioContext non disponible
    }
  }, [stream, enabled])

  return speaking
}
