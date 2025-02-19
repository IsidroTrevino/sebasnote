import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCallback, useMemo, useState } from "react";

type ResponseType = string | null;

type Options = {
    onSuccess?: (data: ResponseType) => void;
    onError?: (error: Error) => void;
    onSettled?: () => void;
    throwError?: boolean;
};

export const useGenerateUploadUrl = () => {
    const mutation = useMutation(api.upload.generateUploadURL);

    const [data, setData] = useState<ResponseType>(null);
    const [error, setError] = useState<Error | null>(null);
    const [state, setState] = useState<"success" | "error" | "settled" | "pending" | null>(null);

    const isPending = useMemo(() => state === "pending", [state]);
    const isSuccess = useMemo(() => state === "success", [state]);
    const isError = useMemo(() => state === "error", [state]);
    const isSettled = useMemo(() => state === "settled", [state]);

    const mutate = useCallback(async (options?: Options) => {
        try {
            setData(null);
            setError(null);
            setState("pending");

            const response = await mutation();
            options?.onSuccess?.(response);
            return response;

        } catch(error) {
            setState("error");
            options?.onError?.(error as Error);

            if(options?.throwError) {
                throw error;
            }
        } finally {
            setState("settled");
            options?.onSettled?.();
        }
    }, [mutation]);

    return {mutate, data, error, isPending, isSuccess, isError, isSettled};
}