"use client"

import { useState, useEffect, useCallback } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Types
export interface UserClassification {
  state_id: string
  city_id: string
  board_id: string
  class_level: number
  state_name?: string
  city_name?: string
  board_name?: string
}

interface StateOption {
  id: string
  name: string
}

interface CityOption {
  id: string
  name: string
}

interface BoardOption {
  id: string
  name: string
}

interface ClassificationSelectorProps {
  value?: UserClassification
  onChange: (classification: UserClassification) => void
  showAllFields?: boolean
  disabled?: boolean
  compact?: boolean
}

// Static data (can also be fetched from API)
const STATES: StateOption[] = [
  { id: "MH", name: "Maharashtra" },
  { id: "KA", name: "Karnataka" },
  { id: "DL", name: "Delhi" },
  { id: "TN", name: "Tamil Nadu" },
  { id: "UP", name: "Uttar Pradesh" },
  { id: "GJ", name: "Gujarat" },
  { id: "RJ", name: "Rajasthan" },
  { id: "WB", name: "West Bengal" },
  { id: "AP", name: "Andhra Pradesh" },
  { id: "TS", name: "Telangana" },
  { id: "KL", name: "Kerala" },
  { id: "MP", name: "Madhya Pradesh" },
  { id: "BR", name: "Bihar" },
  { id: "PB", name: "Punjab" },
  { id: "HR", name: "Haryana" },
]

const CITIES: Record<string, CityOption[]> = {
  MH: [
    { id: "MUM", name: "Mumbai" },
    { id: "PUN", name: "Pune" },
    { id: "NAG", name: "Nagpur" },
    { id: "NAS", name: "Nashik" },
    { id: "AUR", name: "Aurangabad" },
  ],
  KA: [
    { id: "BLR", name: "Bangalore" },
    { id: "MYS", name: "Mysore" },
    { id: "HUB", name: "Hubli" },
    { id: "MNG", name: "Mangalore" },
  ],
  DL: [
    { id: "NDL", name: "New Delhi" },
    { id: "SDL", name: "South Delhi" },
    { id: "EDL", name: "East Delhi" },
    { id: "WDL", name: "West Delhi" },
  ],
  TN: [
    { id: "CHN", name: "Chennai" },
    { id: "CBE", name: "Coimbatore" },
    { id: "MDU", name: "Madurai" },
    { id: "TRY", name: "Tiruchirappalli" },
  ],
  UP: [
    { id: "LKO", name: "Lucknow" },
    { id: "KNP", name: "Kanpur" },
    { id: "AGR", name: "Agra" },
    { id: "VNS", name: "Varanasi" },
    { id: "NOI", name: "Noida" },
  ],
  GJ: [
    { id: "AMD", name: "Ahmedabad" },
    { id: "SRT", name: "Surat" },
    { id: "VAD", name: "Vadodara" },
    { id: "RJK", name: "Rajkot" },
  ],
  RJ: [
    { id: "JPR", name: "Jaipur" },
    { id: "JDH", name: "Jodhpur" },
    { id: "UDR", name: "Udaipur" },
    { id: "KOT", name: "Kota" },
  ],
  WB: [
    { id: "KOL", name: "Kolkata" },
    { id: "HWH", name: "Howrah" },
    { id: "DRG", name: "Durgapur" },
    { id: "ASN", name: "Asansol" },
  ],
  AP: [
    { id: "VJW", name: "Vijayawada" },
    { id: "VSK", name: "Visakhapatnam" },
    { id: "GNT", name: "Guntur" },
    { id: "TRP", name: "Tirupati" },
  ],
  TS: [
    { id: "HYD", name: "Hyderabad" },
    { id: "WGL", name: "Warangal" },
    { id: "NZB", name: "Nizamabad" },
    { id: "KRM", name: "Karimnagar" },
  ],
  KL: [
    { id: "TVM", name: "Thiruvananthapuram" },
    { id: "KOC", name: "Kochi" },
    { id: "KOZ", name: "Kozhikode" },
    { id: "THR", name: "Thrissur" },
  ],
  MP: [
    { id: "BPL", name: "Bhopal" },
    { id: "IND", name: "Indore" },
    { id: "JBP", name: "Jabalpur" },
    { id: "GWL", name: "Gwalior" },
  ],
  BR: [
    { id: "PAT", name: "Patna" },
    { id: "GYA", name: "Gaya" },
    { id: "BHP", name: "Bhagalpur" },
    { id: "MZP", name: "Muzaffarpur" },
  ],
  PB: [
    { id: "CHD", name: "Chandigarh" },
    { id: "LDH", name: "Ludhiana" },
    { id: "AMR", name: "Amritsar" },
    { id: "JAL", name: "Jalandhar" },
  ],
  HR: [
    { id: "GGN", name: "Gurugram" },
    { id: "FBD", name: "Faridabad" },
    { id: "PKL", name: "Panipat" },
    { id: "AMB", name: "Ambala" },
  ],
}

const BOARDS: BoardOption[] = [
  { id: "CBSE", name: "CBSE" },
  { id: "ICSE", name: "ICSE" },
  { id: "MHSB", name: "Maharashtra State Board" },
  { id: "KASB", name: "Karnataka State Board" },
  { id: "TNSB", name: "Tamil Nadu State Board" },
  { id: "UPSB", name: "UP State Board" },
  { id: "WBSB", name: "West Bengal State Board" },
  { id: "APSB", name: "AP State Board" },
  { id: "TSSB", name: "Telangana State Board" },
  { id: "KLSB", name: "Kerala State Board" },
  { id: "GJSB", name: "Gujarat State Board" },
  { id: "RJSB", name: "Rajasthan State Board" },
  { id: "IB", name: "International Baccalaureate (IB)" },
  { id: "IGCSE", name: "Cambridge IGCSE" },
]

const CLASS_LEVELS = [6, 7, 8, 9, 10, 11, 12]

export function ClassificationSelector({
  value,
  onChange,
  showAllFields = true,
  disabled = false,
  compact = false,
}: ClassificationSelectorProps) {
  const [stateId, setStateId] = useState(value?.state_id || "")
  const [cityId, setCityId] = useState(value?.city_id || "")
  const [boardId, setBoardId] = useState(value?.board_id || "")
  const [classLevel, setClassLevel] = useState(value?.class_level || 0)

  const [cities, setCities] = useState<CityOption[]>([])

  // Update cities when state changes
  useEffect(() => {
    if (stateId) {
      setCities(CITIES[stateId] || [])
      // Reset city if state changed
      if (value?.state_id !== stateId) {
        setCityId("")
      }
    } else {
      setCities([])
      setCityId("")
    }
  }, [stateId, value?.state_id])

  // Sync with external value
  useEffect(() => {
    if (value) {
      setStateId(value.state_id || "")
      setCityId(value.city_id || "")
      setBoardId(value.board_id || "")
      setClassLevel(value.class_level || 0)
    }
  }, [value])

  // Notify parent of changes
  const notifyChange = useCallback((updates: Partial<UserClassification>) => {
    const newState = updates.state_id !== undefined ? updates.state_id : stateId
    const newCity = updates.city_id !== undefined ? updates.city_id : cityId
    const newBoard = updates.board_id !== undefined ? updates.board_id : boardId
    const newClass = updates.class_level !== undefined ? updates.class_level : classLevel

    const stateOption = STATES.find(s => s.id === newState)
    const cityOption = (CITIES[newState] || []).find(c => c.id === newCity)
    const boardOption = BOARDS.find(b => b.id === newBoard)

    onChange({
      state_id: newState,
      city_id: newCity,
      board_id: newBoard,
      class_level: newClass,
      state_name: stateOption?.name,
      city_name: cityOption?.name,
      board_name: boardOption?.name,
    })
  }, [stateId, cityId, boardId, classLevel, onChange])

  const handleStateChange = (value: string) => {
    setStateId(value)
    setCityId("") // Reset city when state changes
    notifyChange({ state_id: value, city_id: "" })
  }

  const handleCityChange = (value: string) => {
    setCityId(value)
    notifyChange({ city_id: value })
  }

  const handleBoardChange = (value: string) => {
    setBoardId(value)
    notifyChange({ board_id: value })
  }

  const handleClassChange = (value: string) => {
    const level = parseInt(value, 10)
    setClassLevel(level)
    notifyChange({ class_level: level })
  }

  const gridCols = compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {showAllFields && (
        <>
          {/* State Selector */}
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select
              value={stateId}
              onValueChange={handleStateChange}
              disabled={disabled}
            >
              <SelectTrigger id="state">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {STATES.map((state) => (
                  <SelectItem key={state.id} value={state.id}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City Selector */}
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Select
              value={cityId}
              onValueChange={handleCityChange}
              disabled={disabled || !stateId}
            >
              <SelectTrigger id="city">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Board Selector */}
      <div className="space-y-2">
        <Label htmlFor="board">Board</Label>
        <Select
          value={boardId}
          onValueChange={handleBoardChange}
          disabled={disabled}
        >
          <SelectTrigger id="board">
            <SelectValue placeholder="Select board" />
          </SelectTrigger>
          <SelectContent>
            {BOARDS.map((board) => (
              <SelectItem key={board.id} value={board.id}>
                {board.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Class Selector */}
      <div className="space-y-2">
        <Label htmlFor="class">Class</Label>
        <Select
          value={classLevel ? classLevel.toString() : ""}
          onValueChange={handleClassChange}
          disabled={disabled}
        >
          <SelectTrigger id="class">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {CLASS_LEVELS.map((level) => (
              <SelectItem key={level} value={level.toString()}>
                Class {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export { STATES, CITIES, BOARDS, CLASS_LEVELS }
