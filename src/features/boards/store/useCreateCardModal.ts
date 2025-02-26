import { useAtom, atom } from 'jotai';

const useCreateCardModalAtom = atom(false);

export const useCreateCardModal = () => {
    return useAtom(useCreateCardModalAtom);
}