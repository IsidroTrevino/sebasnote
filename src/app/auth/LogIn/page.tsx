'use client';

import { useQuery } from "convex/react";
import {api} from '../../../../convex/_generated/api'

export default function AuthPage() {
  const tasks = useQuery(api.tasks.get);

  if (tasks === undefined) {
    return <div>Loading...</div>;
  }

  if (tasks === null) {
    return <div>Error loading tasks</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {tasks?.map(({ _id, text }) => <div key={_id}>{text}</div>)}
    </main>
  );
}