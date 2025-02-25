import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useUpdateCard = () => {
  return useMutation(api.cards.update);
};