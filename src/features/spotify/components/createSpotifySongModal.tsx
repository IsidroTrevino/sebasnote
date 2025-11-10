'use client';

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader, Link as LinkIcon, Music2 } from "lucide-react";
import { RatingStars } from "./RatingStars";
import { useBoardId } from "@/features/boards/api/useBoardId";
import { useCreateSpotifySongModal } from "../store/useCreateSpotifySongModal";
import { useFetchSpotifyMeta, SpotifyMeta } from "../api/useFetchSpotifyMeta";
import { useCreateSpotifySong } from "../api/useCreateSpotifySong";
import { toast } from "sonner";

const isSpotifyTrackUrl = (url: string) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname.includes("open.spotify.com") && u.pathname.includes("/track/");
  } catch {
    return false;
  }
};

const msToMinSec = (ms?: number) => {
  if (!ms || ms <= 0) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const parseDuration = (val: string): number | undefined => {
  const v = val.trim();
  if (!v) return undefined;
  // Accept "m:ss" or "mm:ss"
  const parts = v.split(":");
  if (parts.length === 2) {
    const mins = Number(parts[0]);
    const secs = Number(parts[1]);
    if (!Number.isNaN(mins) && !Number.isNaN(secs) && mins >= 0 && secs >= 0 && secs < 60) {
      return (mins * 60 + secs) * 1000;
    }
  }
  // Accept plain seconds "sss"
  if (/^\d+$/.test(v)) {
    const s = Number(v);
    if (!Number.isNaN(s)) return s * 1000;
  }
  return undefined;
};

export const CreateSpotifySongModal = () => {
  const [open, setOpen] = useCreateSpotifySongModal();
  const boardId = useBoardId();
  const { fetchMeta } = useFetchSpotifyMeta();
  const { mutate: createSong, isPending: isCreating } = useCreateSpotifySong();

  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [durationMs, setDurationMs] = useState<number | undefined>(undefined);
  const [durationText, setDurationText] = useState<string>(""); // editable text, parsed into durationMs
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);

  const [rating, setRating] = useState<number>(10);
  const [ratingMin, setRatingMin] = useState<number>(0);
  const [ratingMax, setRatingMax] = useState<number>(10);
  const [ratingDescription, setRatingDescription] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  const reset = useCallback(() => {
    setSpotifyUrl("");
    setTitle("");
    setArtist("");
    setDurationMs(undefined);
    setDurationText("");
    setCoverUrl(undefined);
    setRating(10);
    setRatingMin(0);
    setRatingMax(10);
    setRatingDescription("");
    setIsFetching(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleFetch = async () => {
    if (!spotifyUrl || !isSpotifyTrackUrl(spotifyUrl)) {
      toast.error("Enter a valid Spotify track URL");
      return;
    }
    try {
      setIsFetching(true);
      const meta: SpotifyMeta = await fetchMeta(spotifyUrl);
      setTitle(meta.title || "");
      setArtist(meta.artist || "");
      setDurationMs(meta.durationMs);
      setDurationText(msToMinSec(meta.durationMs));
      setCoverUrl(meta.coverUrl);
      toast.success("Fetched song details from Spotify");
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch Spotify metadata");
    } finally {
      setIsFetching(false);
    }
  };

  const durationInvalid = useMemo(() => {
    if (!durationText) return false; // empty is allowed (optional)
    return parseDuration(durationText) === undefined;
  }, [durationText]);

  const canSubmit = useMemo(() => {
    const hasEssentials = title.trim().length > 0 && artist.trim().length > 0 && !Number.isNaN(rating);
    if (durationInvalid) return false;
    return hasEssentials && boardId !== undefined && !isCreating && !isFetching;
  }, [title, artist, rating, boardId, isCreating, isFetching, durationInvalid]);

  const onSubmit = async () => {
    if (!canSubmit || !boardId) return;

    const parsedDuration = parseDuration(durationText);
    const finalDuration = durationText ? parsedDuration : durationMs;

    try {
      await createSong({
        boardId,
        title: title.trim(),
        artist: artist.trim(),
        rating: Math.max(ratingMin, Math.min(ratingMax, Number(rating))),
        ratingMin,
        ratingMax,
        ratingDescription: ratingDescription.trim() || undefined,
        durationMs: finalDuration,
        spotifyUrl: spotifyUrl || undefined,
        coverUrl,
      });
      toast.success("Song added");
      setOpen(false);
      reset();
    } catch (e) {
      console.error(e);
      toast.error("Failed to add song");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#181818] text-gray-300 border border-[#2a2a2a] max-w-[92vw] w-[860px] max-h-[80vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-[#2a2a2a] shrink-0">
          <DialogTitle className="text-lg">Add a Spotify Song</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 flex-1 overflow-y-auto">
          {/* Left: form */}
          <div className="md:col-span-2 p-6 space-y-6">
            {/* Link fetch row */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-400">Spotify URL (optional)</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  placeholder="https://open.spotify.com/track/..."
                  className="bg-[#0f0f0f] border-[#2a2a2a] text-gray-200"
                />
                <Button
                  type="button"
                  onClick={handleFetch}
                  disabled={isFetching || !isSpotifyTrackUrl(spotifyUrl)}
                  className="bg-[#1DB954] hover:bg-[#18a34a] text-black font-medium"
                >
                  {isFetching ? <Loader className="w-4 h-4 animate-spin" /> : (
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Fetch
                    </div>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Paste a Spotify track link to auto-fill details. You can still edit any field manually.
              </p>
            </div>

            {/* Song details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-400">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Song title"
                  className="bg-[#0f0f0f] border-[#2a2a2a] text-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-400">Artist</Label>
                <Input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Artist name"
                  className="bg-[#0f0f0f] border-[#2a2a2a] text-gray-200"
                />
              </div>
            </div>

            {/* Duration + Cover URL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-400">Duration</Label>
                  <span className="text-[10px] text-gray-500">mm:ss or seconds</span>
                </div>
                <Input
                  value={durationText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDurationText(val);
                    const ms = parseDuration(val);
                    // Don't set invalid ms, only set when valid or empty
                    if (val.trim() === "") {
                      setDurationMs(undefined);
                    } else if (ms !== undefined) {
                      setDurationMs(ms);
                    }
                  }}
                  placeholder="e.g. 3:45 or 225"
                  className={`bg-[#0f0f0f] border ${durationInvalid ? 'border-red-500' : 'border-[#2a2a2a]'} text-gray-200`}
                />
                {durationInvalid && (
                  <p className="text-xs text-red-500">Use mm:ss (e.g. 3:45) or plain seconds (e.g. 225).</p>
                )}
                {durationMs ? (
                  <p className="text-xs text-gray-500">Parsed: {msToMinSec(durationMs)}</p>
                ) : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm text-gray-400">Cover URL (optional)</Label>
                <Input
                  value={coverUrl || ""}
                  onChange={(e) => setCoverUrl(e.target.value || undefined)}
                  placeholder="https://image/url.jpg"
                  className="bg-[#0f0f0f] border-[#2a2a2a] text-gray-200"
                />
              </div>
            </div>

            {/* Rating section */}
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
                    setRating(Math.max(ratingMin, Math.min(ratingMax, Math.round(newRating * 100) / 100)));
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
                  className="w-[100px] bg-[#0f0f0f] border-[#2a2a2a] text-gray-200"
                />
                <span className="text-xs text-gray-500">
                  {ratingMax - ratingMin >= 100 ? rating.toFixed(0) : rating.toFixed(2)} / {ratingMax}
                </span>
                <span className="text-xs font-medium text-[#1DB954]">
                  {(((rating - ratingMin) / (ratingMax - ratingMin)) * 100).toFixed(1)}%
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-400 block">Rating description (optional)</Label>
                <textarea
                  value={ratingDescription}
                  onChange={(e) => setRatingDescription(e.target.value)}
                  placeholder="Why do you rate it this way? Share details (this will show fully in the list view)."
                  rows={6}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-gray-200 rounded-md p-3 min-h-32 resize-y outline-none focus:ring-0"
                />
                <p className="text-xs text-gray-500">Tip: Use multiple lines. The full text will be visible in the board list.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="text-gray-300 hover:bg-[#222222]"
              >
                Cancel
              </Button>
              <Button
                disabled={!canSubmit}
                onClick={onSubmit}
                className="bg-[#1DB954] hover:bg-[#18a34a] text-black font-medium"
              >
                {isCreating ? <Loader className="w-4 h-4 animate-spin" /> : "Add Song"}
              </Button>
            </div>
          </div>

          {/* Right: preview */}
          <div className="border-t md:border-t-0 md:border-l border-[#2a2a2a] p-6">
            <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-md p-4 flex flex-col items-center justify-center">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt="cover"
                  className="rounded-md w-44 h-44 object-cover mb-3"
                />
              ) : (
                <div className="rounded-md w-44 h-44 bg-[#121212] border border-[#2a2a2a] mb-3 flex items-center justify-center">
                  <Music2 className="w-8 h-8 text-gray-500" />
                </div>
              )}
              <div className="text-center">
                <div className="text-gray-200 font-medium truncate max-w-[176px]">{title || "Title"}</div>
                <div className="text-gray-400 text-sm truncate max-w-[176px]">{artist || "Artist"}</div>
                {durationMs ? (
                  <div className="text-gray-500 text-xs mt-1">{msToMinSec(durationMs)}</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
