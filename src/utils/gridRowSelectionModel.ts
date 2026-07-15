/** Helpers for MUI X Data Grid v7+ row selection model ({ type, ids: Set }). */

import type { GridRowId } from '@mui/x-data-grid';

interface GridRowSelectionModelV7 {
	type: string;
	ids: Set<GridRowId>;
}

type RowSelectionModel = GridRowId[] | GridRowSelectionModelV7;

export const createEmptyRowSelectionModel = (): GridRowSelectionModelV7 => ({
	type: 'include',
	ids: new Set<GridRowId>(),
});

export const getSelectedRowIds = (model: RowSelectionModel): GridRowId[] => {
	if (Array.isArray(model)) return model;
	if (!model?.ids) return [];
	return Array.from(model.ids);
};

export const getSelectionCount = (model: RowSelectionModel): number => getSelectedRowIds(model).length;

export const isSelectionEmpty = (model: RowSelectionModel): boolean => getSelectionCount(model) === 0;
