import { useAtom, atom } from 'jotai';

const createCardModalAtom = atom(false);

export const useCreateCardModal = () => {
    return useAtom(createCardModalAtom);
}