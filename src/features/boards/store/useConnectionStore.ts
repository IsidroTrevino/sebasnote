import { create } from "zustand";
import { Id } from "../../../../convex/_generated/dataModel";

interface ConnectionState {
  isConnecting: boolean;
  sourceCardId: Id<"cards"> | null;
  startConnection: (cardId: Id<"cards">) => void;
  endConnection: () => void;
  cancelConnection: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  isConnecting: false,
  sourceCardId: null,
  
  startConnection: (cardId: Id<"cards">) => {
    set({ isConnecting: true, sourceCardId: cardId });
  },
  
  endConnection: () => {
    set({ isConnecting: false, sourceCardId: null });
  },
  
  cancelConnection: () => {
    set({ isConnecting: false, sourceCardId: null });
  },
}));
