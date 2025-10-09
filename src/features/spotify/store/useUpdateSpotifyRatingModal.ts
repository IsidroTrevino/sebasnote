import { atom, useAtom } from "jotai";
import type { Id } from "../../../../convex/_generated/dataModel";

export type UpdateSpotifyRatingPayload = {
  id: Id<"cards">;
  title?: string;
  rating?: number;
  ratingDescription?: string;
};

type UpdateSpotifyRatingState = {
  open: boolean;
  payload?: UpdateSpotifyRatingPayload;
};

const updateSpotifyRatingModalAtom = atom<UpdateSpotifyRatingState>({ open: false });

export const useUpdateSpotifyRatingModal = () => useAtom(updateSpotifyRatingModalAtom);
