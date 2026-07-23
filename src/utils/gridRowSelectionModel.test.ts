import {
	createEmptyRowSelectionModel,
	getSelectedRowIds,
	getSelectionCount,
	isSelectionEmpty,
} from './gridRowSelectionModel';

describe('gridRowSelectionModel', () => {
	const allRowIds = ['1', '2', '3'];

	test('createEmptyRowSelectionModel returns include with empty set', () => {
		const model = createEmptyRowSelectionModel();
		expect(model.type).toBe('include');
		expect(model.ids.size).toBe(0);
	});

	test('getSelectedRowIds supports legacy array models', () => {
		expect(getSelectedRowIds(['a', 'b'])).toEqual(['a', 'b']);
	});

	test('getSelectedRowIds resolves include models', () => {
		expect(getSelectedRowIds({ type: 'include', ids: new Set(['2']) }, allRowIds)).toEqual(['2']);
	});

	test('getSelectedRowIds resolves exclude (select-all) models using allRowIds', () => {
		expect(getSelectedRowIds({ type: 'exclude', ids: new Set() }, allRowIds)).toEqual(['1', '2', '3']);
		expect(getSelectedRowIds({ type: 'exclude', ids: new Set(['2']) }, allRowIds)).toEqual(['1', '3']);
	});

	test('getSelectedRowIds returns empty for exclude without allRowIds', () => {
		expect(getSelectedRowIds({ type: 'exclude', ids: new Set() })).toEqual([]);
	});

	test('getSelectionCount and isSelectionEmpty handle include and exclude', () => {
		expect(getSelectionCount({ type: 'include', ids: new Set(['1']) }, allRowIds)).toBe(1);
		expect(isSelectionEmpty({ type: 'include', ids: new Set() }, allRowIds)).toBe(true);

		expect(getSelectionCount({ type: 'exclude', ids: new Set() }, allRowIds)).toBe(3);
		expect(isSelectionEmpty({ type: 'exclude', ids: new Set() }, allRowIds)).toBe(false);
		expect(isSelectionEmpty({ type: 'exclude', ids: new Set(['1', '2', '3']) }, allRowIds)).toBe(true);

		// Without allRowIds, exclude select-all is treated as non-empty
		expect(isSelectionEmpty({ type: 'exclude', ids: new Set() })).toBe(false);
	});
});
