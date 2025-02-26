import { create } from "zustand";

interface ImageDialogState {
  isOpen: boolean;
  imageUrl: string | null;
  open: (imageUrl: string) => void;
  close: () => void;
}

export const useImageDialog = create<ImageDialogState>((set) => ({
  isOpen: false,
  imageUrl: null,
  open: (imageUrl: string) => set({ isOpen: true, imageUrl }),
  close: () => set({ isOpen: false, imageUrl: null }),
}));