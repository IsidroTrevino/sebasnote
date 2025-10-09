import { atom, useAtom } from "jotai";
import type { Id } from "../../../../convex/_generated/dataModel";

export type DeleteSpotifySongPayload = {
  id: Id<"cards">;
  title?: string;
  artist?: string;
};

type DeleteSpotifySongState = {
  open: boolean;
  payload?: DeleteSpotifySongPayload;
};

const deleteSpotifySongModalAtom = atom<DeleteSpotifySongState>({ open: false });

export const useDeleteSpotifySongModal = () => useAtom(deleteSpotifySongModalAtom);
