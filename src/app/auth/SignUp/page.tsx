'use client';

import { SignUpScreen } from "@/features/auth/signUpScreen";

export default function SignUpPage() {
  return (
    <div className="h-full w-full bg-[#ae6ed3]">
      <div className="flex justify-center items-center h-full">
        <SignUpScreen />
      </div>
    </div>
  );
}