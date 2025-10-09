'use client';

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useBoardId } from "@/features/boards/api/useBoardId";
import { useListSpotifySongs } from "../api/useListSpotifySongs";
import { useUpdateSpotifyRatingModal } from "../store/useUpdateSpotifyRatingModal";
import { useDeleteSpotifySongModal } from "../store/useDeleteSpotifySongModal";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RatingStars } from "./RatingStars";

type DescPreviewProps = { text: string };
const DescriptionPreview: React.FC<DescPreviewProps> = ({ text }) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onEnter = () => {
    timerRef.current = setTimeout(() => setVisible(true), 2000);
  };
  const onLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setVisible(false);
  };

  if (!text) return null;

  return (
    <div className="relative">
      <div
        className="text-gray-500 text-xs truncate max-w-[360px]"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {text}
      </div>
      {visible && (
        <div className="absolute left-0 mt-2 z-50 max-w-[420px]">
          <div className="rounded-md border border-[#2f2f2f] bg-[#0f0f0f] text-gray-200 text-sm p-3 shadow-xl">
            <div className="whitespace-pre-wrap break-words">{text}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const msToMinSec = (ms?: number) => {
  if (!ms || ms <= 0) return "-";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const SpotifySongList: React.FC = () => {
  const boardId = useBoardId();
  const { songs, isLoading } = useListSpotifySongs(boardId);
  const [, setUpdateModal] = useUpdateSpotifyRatingModal();
  const [, setDeleteModal] = useDeleteSpotifySongModal();

  // Suppress any native browser tooltips inside the list (e.g., from stray title attributes)
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const stripTitles = (target: EventTarget | null) => {
      let node: HTMLElement | null = (target as HTMLElement) || null;
      // Walk up a few ancestors to be safe
      for (let i = 0; i < 5 && node; i++) {
        if (node.hasAttribute && node.hasAttribute("title")) {
          node.setAttribute("data-title-suppressed", node.getAttribute("title") || "");
          node.removeAttribute("title");
        }
        node = node.parentElement as HTMLElement | null;
      }
    };

    const handler = (e: Event) => stripTitles(e.target);
    // Use capture to catch early before browser shows tooltip
    el.addEventListener("mouseover", handler, true);
    el.addEventListener("focusin", handler, true);

    return () => {
      el.removeEventListener("mouseover", handler, true);
      el.removeEventListener("focusin", handler, true);
    };
  }, []);

  // Extra safeguard: remove any 'title' attributes added dynamically to descendants
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const removeTitlesInTree = (root: HTMLElement) => {
      root.querySelectorAll<HTMLElement>('[title]').forEach((n) => {
        n.setAttribute('data-title-suppressed', n.getAttribute('title') || '');
        n.removeAttribute('title');
      });
    };

    // Initial sweep
    removeTitlesInTree(el);

    // Observe future mutations to keep stripping titles
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'title') {
          const t = m.target as HTMLElement;
          t.setAttribute('data-title-suppressed', t.getAttribute('title') || '');
          t.removeAttribute('title');
        } else if (m.type === 'childList') {
          m.addedNodes.forEach((node) => {
            if (node.nodeType === 1) removeTitlesInTree(node as HTMLElement);
          });
        }
      }
    });

    mo.observe(el, { attributes: true, attributeFilter: ['title'], subtree: true, childList: true });

    return () => {
      mo.disconnect();
    };
  }, []);

  const onEdit = useCallback(
    (id: any, title?: string, currentRating?: number, currentDesc?: string) => {
      setUpdateModal({
        open: true,
        payload: {
          id,
          title,
          rating: currentRating,
          ratingDescription: currentDesc,
        },
      });
    },
    [setUpdateModal]
  );

  const onDelete = useCallback(
    (id: any, title?: string, artist?: string) => {
      setDeleteModal({
        open: true,
        payload: { id, title, artist },
      });
    },
    [setDeleteModal]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!songs.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">No songs yet. Click &quot;Add Song&quot; to start ranking.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="px-4 pb-6">
      <div className="w-full overflow-x-auto rounded-md border border-[#2f2f2f]">
        <table className="w-full text-left">
          <thead className="bg-[#181818] text-gray-400 text-sm">
            <tr>
              <th className="px-4 py-3 w-12">#</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Artist</th>
              <th className="px-4 py-3 w-24">Rating</th>
              <th className="px-4 py-3 w-24">Duration</th>
              <th className="px-4 py-3 w-20">Link</th>
              <th className="px-4 py-3 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {songs.map((s, idx) => (
              <React.Fragment key={s._id}>
                <tr
                  className={cn(
                    "group border-t border-[#2f2f2f] hover:bg-[#1f1f1f] transition-colors"
                  )}
                >
                  <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm overflow-hidden bg-[#121212] border border-[#2a2a2a] flex items-center justify-center">
                        {s.content.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.content.coverUrl}
                            alt={s.content.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-[10px] text-gray-500">No Cover</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-gray-200 truncate max-w-[360px]">
                          {s.content.title}
                        </div>
                        {s.content.ratingDescription ? (
                          <DescriptionPreview text={s.content.ratingDescription} />
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 truncate max-w-[280px]">
                    {s.content.artist || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <RatingStars
                        value={s.content.rating ?? 0}
                        max={10}
                        size={16}
                        readOnly
                        className="translate-y-[1px]"
                      />
                      <span className="text-gray-300 text-sm">
                        {(s.content.rating ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{msToMinSec(s.content.durationMs)}</td>
                  <td className="px-4 py-3">
                    {s.content.spotifyUrl ? (
                      <a
                        href={s.content.spotifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#1DB954] hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open
                      </a>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(s._id, s.content.title, s.content.rating, s.content.ratingDescription)}
                        className="text-gray-300 hover:bg-[#2a2a2a]"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(s._id, s.content.title, s.content.artist)}
                        className="text-red-400 hover:bg-[#2a2a2a]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
