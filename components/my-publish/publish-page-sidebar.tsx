"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  BookOpen, 
  DollarSign, 
  HelpCircle, 
  BarChart3,
  Settings
} from "lucide-react"

const menuItems = [
  { href: "/my-publish", label: "Publish", icon: BookOpen },
  { href: "/my-publish/monetization-center", label: "Monetization", icon: DollarSign },
  { href: "/my-publish/data-center", label: "Analytics", icon: BarChart3 },
  { href: "/my-publish/my-channel", label: "My Channel", icon: Settings },
  { href: "/my-publish/help-center", label: "Help", icon: HelpCircle },
]

export function PublishSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r p-4">
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className="w-full justify-start"
              >
                <Icon className="w-4 h-4 mr-2" />
                {item.label}
              </Button>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
