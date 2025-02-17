'use client';

import { LogInScreen } from "@/features/auth/logInScreen";

export default function LogInPage() {
  return (
    <div className="h-full w-full bg-[#1a1a1a]">
      <div className="flex justify-center items-center h-full">
        <LogInScreen />
      </div>
    </div>
  );
}