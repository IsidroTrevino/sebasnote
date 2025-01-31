'use client';

import { useBoardId } from "@/features/boards/api/useBoardId";

export default function boardPage() {
    const boardId = useBoardId();
    return (
        <div className="h-full w-full bg-[#ae6ed3]">

        </div>
    );
}