'use client';

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useGetBoards } from "@/features/boards/api/useGetBoards";
import { useCreateBoard } from "@/features/boards/api/useCreateBoard";
import { useAuthActions } from "@convex-dev/auth/react";
import { Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const { homeBoard, isLoading: isBoardsLoading } = useGetBoards();
  const createBoard = useCreateBoard();

  useEffect(() => {
    const createAndRedirect = async () => {
      if (user && !isBoardsLoading) {
        if (!homeBoard) {
          try {
            const newBoard = await createBoard({
              name: "Home",
            });
            router.push(`/${newBoard._id}/${encodeURIComponent("Home")}`);
          } catch (error) {
            console.error("Failed to create Home board:", error);
          }
        } else {
          router.push(`/${homeBoard._id}/${encodeURIComponent(homeBoard.name)}`);
        }
      }
    };

    createAndRedirect();
  }, [user, homeBoard, isBoardsLoading, createBoard, router]);

  if (isUserLoading || isBoardsLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader className="size-4 animate-spin text-muted-foreground"/>
      </div>
    );
  }

  return null;
}