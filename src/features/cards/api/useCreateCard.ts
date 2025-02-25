import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useCreateCard = () => {
  const mutation = useMutation(api.cards.create);
  return { mutate: mutation, isPending: false };
};