"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WelcomeAnimation from "@/components/animations/WelcomeAnimation";

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to dashboard after animation completes
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 2600);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="h-screen w-screen overflow-hidden">
      <WelcomeAnimation />
    </div>
  );
}
