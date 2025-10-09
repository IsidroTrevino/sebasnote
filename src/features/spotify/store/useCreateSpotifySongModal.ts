import { atom, useAtom } from "jotai";

const createSpotifySongModalAtom = atom(false);

export const useCreateSpotifySongModal = () => {
  return useAtom(createSpotifySongModalAtom);
};
