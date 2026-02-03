'use client';

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useGetHome } from "@/features/boards/api/useGetHome";
import { useCreateBoard } from "@/features/boards/api/useCreateBoard";
import { Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BoardType } from "@/features/types/boardType";

export default function Home() {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const { homeBoard, isLoading: isBoardsLoading } = useGetHome();
  const {mutate} = useCreateBoard();

  useEffect(() => {
    const createAndRedirect = async () => {
      if (user && !isBoardsLoading) {
        if (!homeBoard) {
          try {
            const response = await mutate({
              name: "Home",
              parentId: undefined,
              isHome: true,
              isDocument: false
            });
            const newBoard = response as unknown as BoardType;
            
            if (newBoard && newBoard._id) {
              router.push(`/${newBoard._id}/${encodeURIComponent("Home")}`);
            }
          } catch (error) {
            console.error("Failed to create Home board:", error);
          }
        } else {
          router.push(`/${homeBoard._id}/${encodeURIComponent(homeBoard.name)}`);
        }
      }
    };

    createAndRedirect();
  }, [user, homeBoard, isBoardsLoading, mutate, router]);

  if(isBoardsLoading || isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-[#1a1a1a] text-gray-200">
        <Loader className="size-8 animate-spin text-muted-foreground"/>
      </div>
    );
  }
}