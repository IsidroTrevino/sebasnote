import { create } from "zustand";
import { Doc } from "../../../../convex/_generated/dataModel";

interface UpdateCardModalStore {
  isOpen: boolean;
  card: Doc<"cards"> | null;
  onOpen: (card: Doc<"cards">) => void;
  onClose: () => void;
}

export const useUpdateCardModal = create<UpdateCardModalStore>((set) => ({
  isOpen: false,
  card: null,
  onOpen: (card) => set({ isOpen: true, card }),
  onClose: () => set({ isOpen: false, card: null })
}));