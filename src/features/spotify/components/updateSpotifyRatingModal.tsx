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
  const [ratingMin, setRatingMin] = useState<number>(payload?.ratingMin ?? 0);
  const [ratingMax, setRatingMax] = useState<number>(payload?.ratingMax ?? 10);
  const [ratingDescription, setRatingDescription] = useState<string>(payload?.ratingDescription ?? "");

  const { mutate: updateRating, isPending } = useUpdateSpotifyRating();

  useEffect(() => {
    if (open) {
      setRating(payload?.rating ?? 10);
      setRatingMin(payload?.ratingMin ?? 0);
      setRatingMax(payload?.ratingMax ?? 10);
      setRatingDescription(payload?.ratingDescription ?? "");
    }
  }, [open, payload?.rating, payload?.ratingMin, payload?.ratingMax, payload?.ratingDescription]);

  const canSubmit = useMemo(() => {
    return !!payload?.id && !Number.isNaN(rating) && rating >= ratingMin && rating <= ratingMax && !isPending;
  }, [payload?.id, rating, ratingMin, ratingMax, isPending]);

  const onClose = () => setState({ open: false, payload: undefined });

  const onSave = async () => {
    if (!payload?.id) return;
    try {
      const rounded = Math.round(Math.max(ratingMin, Math.min(ratingMax, Number(rating))) * 100) / 100;
      await updateRating({ 
        id: payload.id, 
        rating: rounded,
        ratingMin,
        ratingMax,
        ratingDescription: ratingDescription.trim() || undefined 
      });
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
            
            {/* Rating scale selector */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-gray-500">Custom Range:</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={-10000}
                  max={10000}
                  value={ratingMin}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isNaN(n)) {
                      const newMin = Math.floor(n);
                      setRatingMin(newMin);
                      // Ensure rating is within new bounds
                      if (rating < newMin) setRating(newMin);
                      // Ensure max is still greater than min
                      if (ratingMax <= newMin) setRatingMax(newMin + 1);
                    }
                  }}
                  placeholder="Min"
                  className="w-[80px] bg-[#0f0f0f] border-[#2a2a2a] text-gray-200 text-xs"
                />
                <span className="text-xs text-gray-500">to</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={ratingMin + 1}
                  max={10000}
                  value={ratingMax}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isNaN(n) && n > ratingMin) {
                      const newMax = Math.floor(n);
                      setRatingMax(newMax);
                      // Ensure rating is within new bounds
                      if (rating > newMax) setRating(newMax);
                    }
                  }}
                  placeholder="Max"
                  className="w-[80px] bg-[#0f0f0f] border-[#2a2a2a] text-gray-200 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <RatingStars
                value={((rating - ratingMin) / (ratingMax - ratingMin)) * 10}
                max={10}
                size={20}
                onChange={(v) => {
                  const percentage = v / 10;
                  const range = ratingMax - ratingMin;
                  const newRating = ratingMin + (percentage * range);
                  const clamped = Math.max(ratingMin, Math.min(ratingMax, Math.round(newRating * 100) / 100));
                  setRating(clamped);
                }}
              />
              <Input
                type="number"
                inputMode="decimal"
                min={ratingMin}
                max={ratingMax}
                step={ratingMax - ratingMin >= 100 ? "1" : "0.01"}
                value={Number.isNaN(rating) ? "" : rating}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n)) {
                    const clamped = Math.max(ratingMin, Math.min(ratingMax, n));
                    setRating(Math.round(clamped * 100) / 100);
                  } else if (e.target.value === "") {
                    setRating(ratingMin);
                  }
                }}
                className="w-[110px] bg-[#0f0f0f] border-[#2a2a2a] text-gray-200"
              />
              <span className="text-xs text-gray-500">
                {ratingMax - ratingMin >= 100 ? rating.toFixed(0) : rating.toFixed(2)} / {ratingMax}
              </span>
              <span className="text-xs font-medium text-[#1DB954]">
                {(((rating - ratingMin) / (ratingMax - ratingMin)) * 100).toFixed(1)}%
              </span>
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
