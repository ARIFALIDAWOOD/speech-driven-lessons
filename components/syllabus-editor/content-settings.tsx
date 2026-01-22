"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ContentSettingsProps {
  textAmount: string;
  setTextAmount: (value: string) => void;
}

export function ContentSettings({
  textAmount,
  setTextAmount,
}: ContentSettingsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Content Density</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={textAmount}
          onValueChange={setTextAmount}
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="light" id="light" />
            <Label htmlFor="light" className="text-sm cursor-pointer">
              Light - Key points only
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="medium" id="medium" />
            <Label htmlFor="medium" className="text-sm cursor-pointer">
              Medium - Balanced content
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="detailed" id="detailed" />
            <Label htmlFor="detailed" className="text-sm cursor-pointer">
              Detailed - Comprehensive coverage
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
