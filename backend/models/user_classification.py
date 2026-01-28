"""User Classification Models.

Data classes for user classification (State/City/Board/Class).
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class UserClassification:
    """User classification data."""

    user_id: str
    state_id: str
    city_id: str
    board_id: str
    class_level: int  # 6-12
    state_name: Optional[str] = None
    city_name: Optional[str] = None
    board_name: Optional[str] = None
    is_complete: bool = True
    id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "state_id": self.state_id,
            "city_id": self.city_id,
            "board_id": self.board_id,
            "class_level": self.class_level,
            "state_name": self.state_name,
            "city_name": self.city_name,
            "board_name": self.board_name,
            "is_complete": self.is_complete,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "UserClassification":
        """Create from dictionary."""
        return cls(
            id=data.get("id"),
            user_id=data.get("user_id", ""),
            state_id=data.get("state_id", ""),
            city_id=data.get("city_id", ""),
            board_id=data.get("board_id", ""),
            class_level=data.get("class_level", 6),
            state_name=data.get("state_name"),
            city_name=data.get("city_name"),
            board_name=data.get("board_name"),
            is_complete=data.get("is_complete", True),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )


@dataclass
class SetClassificationRequest:
    """Request to set user classification."""

    state_id: str
    city_id: str
    board_id: str
    class_level: int
    state_name: Optional[str] = None
    city_name: Optional[str] = None
    board_name: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "state_id": self.state_id,
            "city_id": self.city_id,
            "board_id": self.board_id,
            "class_level": self.class_level,
            "state_name": self.state_name,
            "city_name": self.city_name,
            "board_name": self.board_name,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "SetClassificationRequest":
        """Create from dictionary."""
        return cls(
            state_id=data.get("state_id", ""),
            city_id=data.get("city_id", ""),
            board_id=data.get("board_id", ""),
            class_level=data.get("class_level", 6),
            state_name=data.get("state_name"),
            city_name=data.get("city_name"),
            board_name=data.get("board_name"),
        )


@dataclass
class ClassificationCheckResponse:
    """Response for classification completion check."""

    is_complete: bool
    classification: Optional[UserClassification] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "is_complete": self.is_complete,
            "classification": self.classification.to_dict() if self.classification else None,
        }


# Static data for classification options
STATES = [
    {"id": "MH", "name": "Maharashtra"},
    {"id": "KA", "name": "Karnataka"},
    {"id": "DL", "name": "Delhi"},
    {"id": "TN", "name": "Tamil Nadu"},
    {"id": "UP", "name": "Uttar Pradesh"},
    {"id": "GJ", "name": "Gujarat"},
    {"id": "RJ", "name": "Rajasthan"},
    {"id": "WB", "name": "West Bengal"},
    {"id": "AP", "name": "Andhra Pradesh"},
    {"id": "TS", "name": "Telangana"},
    {"id": "KL", "name": "Kerala"},
    {"id": "MP", "name": "Madhya Pradesh"},
    {"id": "BR", "name": "Bihar"},
    {"id": "PB", "name": "Punjab"},
    {"id": "HR", "name": "Haryana"},
]

CITIES = {
    "MH": [
        {"id": "MUM", "name": "Mumbai"},
        {"id": "PUN", "name": "Pune"},
        {"id": "NAG", "name": "Nagpur"},
        {"id": "NAS", "name": "Nashik"},
        {"id": "AUR", "name": "Aurangabad"},
    ],
    "KA": [
        {"id": "BLR", "name": "Bangalore"},
        {"id": "MYS", "name": "Mysore"},
        {"id": "HUB", "name": "Hubli"},
        {"id": "MNG", "name": "Mangalore"},
    ],
    "DL": [
        {"id": "NDL", "name": "New Delhi"},
        {"id": "SDL", "name": "South Delhi"},
        {"id": "EDL", "name": "East Delhi"},
        {"id": "WDL", "name": "West Delhi"},
    ],
    "TN": [
        {"id": "CHN", "name": "Chennai"},
        {"id": "CBE", "name": "Coimbatore"},
        {"id": "MDU", "name": "Madurai"},
        {"id": "TRY", "name": "Tiruchirappalli"},
    ],
    "UP": [
        {"id": "LKO", "name": "Lucknow"},
        {"id": "KNP", "name": "Kanpur"},
        {"id": "AGR", "name": "Agra"},
        {"id": "VNS", "name": "Varanasi"},
        {"id": "NOI", "name": "Noida"},
    ],
    "GJ": [
        {"id": "AMD", "name": "Ahmedabad"},
        {"id": "SRT", "name": "Surat"},
        {"id": "VAD", "name": "Vadodara"},
        {"id": "RJK", "name": "Rajkot"},
    ],
    "RJ": [
        {"id": "JPR", "name": "Jaipur"},
        {"id": "JDH", "name": "Jodhpur"},
        {"id": "UDR", "name": "Udaipur"},
        {"id": "KOT", "name": "Kota"},
    ],
    "WB": [
        {"id": "KOL", "name": "Kolkata"},
        {"id": "HWH", "name": "Howrah"},
        {"id": "DRG", "name": "Durgapur"},
        {"id": "ASN", "name": "Asansol"},
    ],
    "AP": [
        {"id": "VJW", "name": "Vijayawada"},
        {"id": "VSK", "name": "Visakhapatnam"},
        {"id": "GNT", "name": "Guntur"},
        {"id": "TRP", "name": "Tirupati"},
    ],
    "TS": [
        {"id": "HYD", "name": "Hyderabad"},
        {"id": "WGL", "name": "Warangal"},
        {"id": "NZB", "name": "Nizamabad"},
        {"id": "KRM", "name": "Karimnagar"},
    ],
    "KL": [
        {"id": "TVM", "name": "Thiruvananthapuram"},
        {"id": "KOC", "name": "Kochi"},
        {"id": "KOZ", "name": "Kozhikode"},
        {"id": "THR", "name": "Thrissur"},
    ],
    "MP": [
        {"id": "BPL", "name": "Bhopal"},
        {"id": "IND", "name": "Indore"},
        {"id": "JBP", "name": "Jabalpur"},
        {"id": "GWL", "name": "Gwalior"},
    ],
    "BR": [
        {"id": "PAT", "name": "Patna"},
        {"id": "GYA", "name": "Gaya"},
        {"id": "BHP", "name": "Bhagalpur"},
        {"id": "MZP", "name": "Muzaffarpur"},
    ],
    "PB": [
        {"id": "CHD", "name": "Chandigarh"},
        {"id": "LDH", "name": "Ludhiana"},
        {"id": "AMR", "name": "Amritsar"},
        {"id": "JAL", "name": "Jalandhar"},
    ],
    "HR": [
        {"id": "GGN", "name": "Gurugram"},
        {"id": "FBD", "name": "Faridabad"},
        {"id": "PKL", "name": "Panipat"},
        {"id": "AMB", "name": "Ambala"},
    ],
}

BOARDS = [
    {"id": "CBSE", "name": "CBSE"},
    {"id": "ICSE", "name": "ICSE"},
    {"id": "MHSB", "name": "Maharashtra State Board"},
    {"id": "KASB", "name": "Karnataka State Board"},
    {"id": "TNSB", "name": "Tamil Nadu State Board"},
    {"id": "UPSB", "name": "UP State Board"},
    {"id": "WBSB", "name": "West Bengal State Board"},
    {"id": "APSB", "name": "AP State Board"},
    {"id": "TSSB", "name": "Telangana State Board"},
    {"id": "KLSB", "name": "Kerala State Board"},
    {"id": "GJSB", "name": "Gujarat State Board"},
    {"id": "RJSB", "name": "Rajasthan State Board"},
    {"id": "IB", "name": "International Baccalaureate (IB)"},
    {"id": "IGCSE", "name": "Cambridge IGCSE"},
]

CLASS_LEVELS = [6, 7, 8, 9, 10, 11, 12]
