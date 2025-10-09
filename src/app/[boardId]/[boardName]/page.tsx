'use client';

import { useGetBoard } from "@/features/boards/api/useGetBoard";
import { useBoardId } from "@/features/boards/api/useBoardId";
import { useGetChildren } from "@/features/boards/api/useGetChildren";
import { BoardCard } from "@/components/boardCard";
import { Loader, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { useCreateCardModal } from "@/features/boards/store/useCreateCardModal";
import { useGetBoardCards } from "@/features/boards/api/useGetCards";
import { Document } from "@/components/document";
import { useGetDocument } from "@/features/boards/api/useGetDocument";
import { SpotifySongList } from "@/features/spotify/components/SpotifySongList";
import { useCreateSpotifySongModal } from "@/features/spotify/store/useCreateSpotifySongModal";

export default function BoardPage() {
  const boardId = useBoardId();
  const board = useGetBoard({ id: boardId });
  const { boards: children, isLoading: isLoadingChildren } = useGetChildren(boardId);
  const { cards, isLoading: isLoadingCards } = useGetBoardCards(boardId);
  const { document: boardDocument, isLoading: isLoadingDocument } = useGetDocument(boardId);
  const router = useRouter();
  const [, setCreateCardOpen] = useCreateCardModal();
  const [, setSpotifyModalOpen] = useCreateSpotifySongModal();

  // Disable all native browser tooltips globally so only custom tooltips appear
  useEffect(() => {
    const root = document.body;
    if (!root) return;

    const stripUp = (target: EventTarget | null) => {
      let node = target as HTMLElement | null;
      for (let i = 0; i < 6 && node; i++) {
        if (node.hasAttribute && node.hasAttribute('title')) {
          node.setAttribute('data-title-suppressed', node.getAttribute('title') || '');
          node.removeAttribute('title');
        }
        node = node.parentElement;
      }
    };

    const handler = (e: Event) => stripUp(e.target);

    // Capture phase to intercept before the browser renders native tooltips
    root.addEventListener('mouseover', handler, true);
    root.addEventListener('focusin', handler, true);

    // Initial sweep to remove any existing title attributes
    const sweep = (n: HTMLElement) => {
      n.querySelectorAll<HTMLElement>('[title]').forEach(el => {
        el.setAttribute('data-title-suppressed', el.getAttribute('title') || '');
        el.removeAttribute('title');
      });
    };
    sweep(root);

    // Observe future mutations and keep stripping titles
    const mo = new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'title') {
          const t = m.target as HTMLElement;
          t.setAttribute('data-title-suppressed', t.getAttribute('title') || '');
          t.removeAttribute('title');
        } else if (m.type === 'childList') {
          m.addedNodes.forEach(node => {
            if (node.nodeType === 1) sweep(node as HTMLElement);
          });
        }
      });
    });
    mo.observe(root, { attributes: true, attributeFilter: ['title'], subtree: true, childList: true });

    return () => {
      root.removeEventListener('mouseover', handler, true);
      root.removeEventListener('focusin', handler, true);
      mo.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isLoadingChildren && !board) {
      router.push('/');
    }
  }, [board, isLoadingChildren, router]);

  if (isLoadingChildren || !board) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#1a1a1a]">
        <Loader className="size-8 animate-spin text-muted-foreground"/>
      </div>
    );
  }

  if (!board?.isHome) {
    return (
      <div className="flex flex-col h-screen w-full bg-[#1a1a1a]">
        {board?.isDocument ? (
          <div className="p-4 flex-1 overflow-auto">
            {isLoadingDocument ? (
              <div className="flex items-center justify-center h-full">
                <Loader className="size-8 animate-spin text-muted-foreground"/>
              </div>
            ) : (
              <Document 
                boardId={boardId} 
                initialContent={boardDocument?.content || ''}
              />
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-end p-4 w-full">
              {board?.isSpotify ? (
                <Button
                  className="mr-4 mt-4 bg-[#1DB954] hover:bg-[#18a34a] text-black font-medium"
                  onClick={() => setSpotifyModalOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4"/> Add Song
                </Button>
              ) : (
                <Button
                  className="mr-4 mt-4 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-200 border border-[#3a3a3a]"
                  onClick={() => setCreateCardOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4"/> Add Card
                </Button>
              )}
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {board?.isSpotify ? (
                <SpotifySongList />
              ) : isLoadingCards ? (
                <div className="flex items-center justify-center h-full">
                  <Loader className="size-8 animate-spin text-muted-foreground"/>
                </div>
              ) : cards.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">No cards yet. Click &quot;Add Card&quot; to create one.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-6 p-4">
                  {cards.map((card) => (
                    <Card key={card._id} card={card} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Home board view
  return (
    <div className="flex flex-col h-screen w-screen p-6 bg-[#1a1a1a]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-grow">
        {children?.map((board) => (
          <BoardCard 
            key={board._id} 
            id={board._id} 
            name={board.name} 
          />
        ))}
      </div>
    </div>
  );
}
