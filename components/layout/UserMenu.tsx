"use client";

import { useRouter } from "next/navigation";
import { ChevronUp, User, LogOut } from "lucide-react";
import { useAuth } from "@/auth/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

function getInitials(email: string | null): string {
  if (!email) return "?";
  const parts = email.split("@")[0];
  if (parts.length >= 2) {
    return parts.slice(0, 2).toUpperCase();
  }
  return parts.toUpperCase();
}

function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-[120px]" />
      </div>
    </div>
  );
}

function LoginPrompt() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/login")}
      className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
    >
      <Avatar className="h-10 w-10 bg-gray-200">
        <AvatarFallback>
          <User className="h-5 w-5 text-gray-500" />
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">Sign In</span>
    </button>
  );
}

export function UserMenu() {
  const { user, userEmail, signOut, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading) {
    return <UserMenuSkeleton />;
  }

  if (!user) {
    return <LoginPrompt />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
          <Avatar className="h-10 w-10 bg-emerald-100">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
              {getInitials(userEmail)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
              {userEmail}
            </p>
          </div>
          <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuItem
          onClick={() => router.push("/profile")}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
