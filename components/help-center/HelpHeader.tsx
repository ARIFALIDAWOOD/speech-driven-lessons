"use client"

interface HelpHeaderProps {
  title?: string
  description?: string
}

export function HelpHeader({ 
  title = "Help Center", 
  description = "Find answers to your questions" 
}: HelpHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
      {description && <p className="text-gray-600">{description}</p>}
    </div>
  )
}
