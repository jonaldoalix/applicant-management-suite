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

/**
 * Resolve selected row IDs from a selection model.
 * - `include`: `ids` are selected
 * - `exclude`: everything in `allRowIds` except `ids` is selected (select-all)
 */
export const getSelectedRowIds = (
	model: RowSelectionModel,
	allRowIds: readonly GridRowId[] = [],
): GridRowId[] => {
	if (Array.isArray(model)) return model;
	if (!model?.ids) return [];
	if (model.type === 'exclude') {
		return allRowIds.filter((id) => !model.ids.has(id));
	}
	return Array.from(model.ids);
};

export const getSelectionCount = (
	model: RowSelectionModel,
	allRowIds: readonly GridRowId[] = [],
): number => getSelectedRowIds(model, allRowIds).length;

export const isSelectionEmpty = (
	model: RowSelectionModel,
	allRowIds: readonly GridRowId[] = [],
): boolean => {
	if (Array.isArray(model)) return model.length === 0;
	if (!model?.ids) return true;
	// Exclude with unknown row set: empty `ids` means select-all (not empty).
	if (model.type === 'exclude' && allRowIds.length === 0) {
		return false;
	}
	return getSelectionCount(model, allRowIds) === 0;
};
