import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useCreateCard = () => {
  const createCard = useMutation(api.cards.createCard);

  return {
    mutate: createCard,
    isPending: createCard.isPending,
  };
};