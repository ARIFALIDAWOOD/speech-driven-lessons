"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface SelectVoiceStepProps {
  aiVoice: string
  setAiVoice: (voice: string) => void
}

const voices = [
  { id: "female1", label: "Female Voice 1", description: "Clear and professional" },
  { id: "female2", label: "Female Voice 2", description: "Warm and friendly" },
  { id: "male1", label: "Male Voice 1", description: "Authoritative and clear" },
  { id: "male2", label: "Male Voice 2", description: "Calm and engaging" },
]

export function SelectVoiceStep({ aiVoice, setAiVoice }: SelectVoiceStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select AI Voice</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Choose the voice that will narrate your course content.
          </p>
          <RadioGroup value={aiVoice} onValueChange={setAiVoice}>
            {voices.map((voice) => (
              <div key={voice.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value={voice.id} id={voice.id} />
                <Label htmlFor={voice.id} className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">{voice.label}</div>
                    <div className="text-sm text-gray-500">{voice.description}</div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  )
}
