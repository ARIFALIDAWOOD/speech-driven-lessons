"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Edit3 } from "lucide-react"

interface ProfileHeaderProps {
  name: string
  email: string
  school?: string
  avatarUrl?: string
  onEdit?: () => void
}

export function ProfileHeader({
  name,
  email,
  school,
  avatarUrl,
  onEdit
}: ProfileHeaderProps) {
  const baseForInitials = (name || email || "").trim()

  const initials = baseForInitials
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex items-center gap-4 p-6 bg-white rounded-lg border">
      <Avatar className="w-20 h-20">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <h1 className="text-2xl font-bold">{name}</h1>
        <p className="text-gray-600">{email}</p>
        {school && <p className="text-sm text-gray-500">{school}</p>}
      </div>
      {onEdit && (
        <Button variant="outline" onClick={onEdit}>
          <Edit3 className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      )}
    </div>
  )
}
