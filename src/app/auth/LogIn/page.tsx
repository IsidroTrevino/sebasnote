'use client';

import { LogInScreen } from "@/app/features/auth/logInScreen";

export default function AuthPage() {
  return (
    <div className="h-full w-full bg-[#ae6ed3]">
      <div className="flex justify-center items-center h-full">
        <LogInScreen />
      </div>
    </div>
  );
}