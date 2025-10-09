'use client';

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteSpotifySongModal } from "../store/useDeleteSpotifySongModal";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";

export const DeleteSpotifySongModal: React.FC = () => {
  const [state, setState] = useDeleteSpotifySongModal();
  const open = state.open;
  const payload = state.payload;

  const removeSong = useMutation(api.spotifySongs.remove);
  const [isPending, setIsPending] = React.useState(false);

  const onClose = () => setState({ open: false, payload: undefined });

  const onConfirm = async () => {
    if (!payload?.id) return;
    try {
      setIsPending(true);
      await removeSong({ id: payload.id });
      toast.success("Song removed");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove song");
    } finally {
      setIsPending(false);
    }
  };

  const title = payload?.title || "this song";
  const artist = payload?.artist ? ` — ${payload.artist}` : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#181818] text-gray-300 border border-[#2a2a2a] max-w-[92vw] w-[480px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-[#2a2a2a]">
          <DialogTitle className="text-lg">Remove song</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <p className="text-gray-400">
            Are you sure you want to delete
            <span className="text-gray-200"> {title}{artist}</span> from this list? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-gray-300 hover:bg-[#222222]"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteSpotifySongModal;
