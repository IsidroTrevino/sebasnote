import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useCreateBoard = () => {
  return useMutation(api.boards.create);
};