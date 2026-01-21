"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Video, VideoOff } from "lucide-react"

interface CameraComponentProps {
  onVideoReady?: (stream: MediaStream | null) => void
  className?: string
}

export default function CameraComponent({ onVideoReady, className }: CameraComponentProps) {
  const [isActive, setIsActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsActive(true)
        onVideoReady?.(stream)
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      setIsActive(false)
      onVideoReady?.(null)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
    onVideoReady?.(null)
  }

  const toggleCamera = () => {
    if (isActive) {
      stopCamera()
    } else {
      startCamera()
    }
  }

  return (
    <div className={`relative ${className || ""}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover rounded-lg ${
          isActive ? "" : "bg-gray-900"
        }`}
      />
      <div className="absolute bottom-4 right-4">
        <Button
          variant={isActive ? "destructive" : "default"}
          size="icon"
          onClick={toggleCamera}
        >
          {isActive ? (
            <VideoOff className="w-4 h-4" />
          ) : (
            <Video className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
