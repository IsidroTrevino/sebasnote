'use client';

import { SignUpScreen } from "@/features/auth/signUpScreen";

export default function SignUpPage() {
  return (
    <div className="min-h-[100dvh] w-full bg-[#1a1a1a]">
      <div className="flex min-h-[100dvh] items-center justify-center p-4">
        <SignUpScreen />
      </div>
    </div>
  );
}
