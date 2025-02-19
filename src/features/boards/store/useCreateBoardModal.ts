import { useAtom, atom } from 'jotai';

const useCreateBoardModalAtom = atom(false);

export const useCreateBoardModal = () => {
    return useAtom(useCreateBoardModalAtom);
}