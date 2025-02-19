import { useAtom, atom } from 'jotai';

const useUpdateBoardModalAtom = atom(false);

export const useUpdateBoardModal = () => {
    return useAtom(useUpdateBoardModalAtom);
}