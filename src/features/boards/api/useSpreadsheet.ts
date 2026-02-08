import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useCallback } from 'react';

export const useGetSpreadsheet = (boardId: Id<'boards'> | undefined) => {
  const spreadsheet = useQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    boardId ? api.spreadsheets.getSpreadsheet : (null as any),
    boardId ? { boardId } : 'skip'
  );

  return {
    spreadsheet,
    isLoading: spreadsheet === undefined,
  };
};

export const useUpdateCell = () => {
  const mutation = useMutation(api.spreadsheets.updateCell);

  return useCallback(
    async (boardId: Id<'boards'>, row: number, col: number, value: string, formula?: string) => {
      return mutation({ boardId, row, col, value, formula });
    },
    [mutation]
  );
};

export const useUpdateCellFormat = () => {
  const mutation = useMutation(api.spreadsheets.updateCellFormat);

  return useCallback(
    async (boardId: Id<'boards'>, row: number, col: number, format: object) => {
      return mutation({ boardId, row, col, format });
    },
    [mutation]
  );
};

export const useCreateSpreadsheet = () => {
  const mutation = useMutation(api.spreadsheets.createSpreadsheet);

  return useCallback(
    async (boardId: Id<'boards'>) => {
      return mutation({ boardId });
    },
    [mutation]
  );
};

export const useBatchUpdateCells = () => {
  const mutation = useMutation(api.spreadsheets.batchUpdateCells);

  return useCallback(
    async (boardId: Id<'boards'>, updates: Array<{ row: number; col: number; value?: string; formula?: string; format?: object; replaceFormat?: boolean }>) => {
      return mutation({ boardId, updates });
    },
    [mutation]
  );
};

export const useResizeSpreadsheet = () => {
  const resizeColsMutation = useMutation(api.spreadsheets.resizeColumns);
  const resizeRowsMutation = useMutation(api.spreadsheets.resizeRows);

  const resizeColumns = useCallback(
    async (boardId: Id<'boards'>, cols: number) => {
      return resizeColsMutation({ boardId, cols });
    },
    [resizeColsMutation]
  );

  const resizeRows = useCallback(
    async (boardId: Id<'boards'>, rows: number) => {
      return resizeRowsMutation({ boardId, rows });
    },
    [resizeRowsMutation]
  );

  return { resizeColumns, resizeRows };
};
