import { useAtom, atom } from 'jotai';

const useReferenceImageModalAtom = atom(false);

export const useReferenceImageModal = () => {
    return useAtom(useReferenceImageModalAtom);
};