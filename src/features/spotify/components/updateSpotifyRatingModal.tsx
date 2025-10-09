'use client';

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RatingStars } from "./RatingStars";
import { useUpdateSpotifyRating } from "../api/useUpdateSpotifyRating";
import { useUpdateSpotifyRatingModal } from "../store/useUpdateSpotifyRatingModal";
import { toast } from "sonner";

export const UpdateSpotifyRatingModal: React.FC = () => {
  const [state, setState] = useUpdateSpotifyRatingModal();
  const open = state.open;
  const payload = state.payload;

  const [rating, setRating] = useState<number>(payload?.rating ?? 10);
  const [ratingDescription, setRatingDescription] = useState<string>(payload?.ratingDescription ?? "");

  const { mutate: updateRating, isPending } = useUpdateSpotifyRating();

  useEffect(() => {
    if (open) {
      setRating(payload?.rating ?? 10);
      setRatingDescription(payload?.ratingDescription ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payload?.rating, payload?.ratingDescription]);

  const canSubmit = useMemo(() => {
    return !!payload?.id && !Number.isNaN(rating) && rating >= 0 && rating <= 10 && !isPending;
  }, [payload?.id, rating, isPending]);

  const onClose = () => setState({ open: false, payload: undefined });

  const onSave = async () => {
    if (!payload?.id) return;
    try {
      const rounded = Math.round(Math.max(0, Math.min(10, Number(rating))) * 100) / 100;
      await updateRating({ id: payload.id, rating: rounded, ratingDescription: ratingDescription.trim() || undefined });
      toast.success("Rating updated");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update rating");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#181818] text-gray-300 border border-[#2a2a2a] max-w-[92vw] w-[520px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-[#2a2a2a]">
          <DialogTitle className="text-lg">
            Edit rating{payload?.title ? ` — ${payload.title}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          <div className="space-y-3">
            <Label className="text-sm text-gray-400">Rating</Label>
            <div className="flex items-center gap-3">
              <RatingStars
                value={rating}
                max={10}
                size={20}
                onChange={(v) => {
                  const clamped = Math.max(0, Math.min(10, Math.round(v * 100) / 100));
                  setRating(clamped);
                }}
              />
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={10}
                step="0.01"
                value={Number.isNaN(rating) ? "" : rating}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n)) {
                    const clamped = Math.max(0, Math.min(10, n));
                    setRating(Math.round(clamped * 100) / 100);
                  } else if (e.target.value === "") {
                    setRating(0);
                  }
                }}
                className="w-[110px] bg-[#0f0f0f] border-[#2a2a2a] text-gray-200"
              />
              <span className="text-xs text-gray-500">{rating.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-gray-400 block">Rating description (optional)</Label>
            <textarea
              value={ratingDescription}
              onChange={(e) => setRatingDescription(e.target.value)}
              placeholder="Why do you rate it this way?"
              rows={6}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-gray-200 rounded-md p-3 min-h-32 resize-y outline-none focus:ring-0"
            />
          </div>

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
              onClick={onSave}
              disabled={!canSubmit}
              className="bg-[#1DB954] hover:bg-[#18a34a] text-black font-medium"
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateSpotifyRatingModal;
