'use client';

import { LogInScreen } from "@/features/auth/logInScreen";

export default function LogInPage() {
  return (
    <div className="min-h-[100dvh] w-full bg-[#1a1a1a]">
      <div className="flex min-h-[100dvh] items-center justify-center p-4">
        <LogInScreen />
      </div>
    </div>
  );
}
