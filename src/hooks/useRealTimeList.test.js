import { renderHook, waitFor } from '@testing-library/react';
import { useRealTimeList } from './useRealTimeList';
import { useAuth } from '../context/AuthContext';
import { getCollectionData } from '../config/data/firebase';

// --- MOCKS ---
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../context/ConfigContext', () => ({ useConfig: () => ({ APPLICATION_DEADLINE: '2025-01-01' }) }));
jest.mock('react-router-dom', () => ({ useParams: () => ({ year: null }) }));

jest.mock('../config/data/firebase', () => ({
	getCollectionData: jest.fn(),
}));

// FIXED: Define the mock config properly
const mockFetcher = jest.fn();
jest.mock('../config/admin', () => ({
	adminLists: {
		testList: {
			fetcher: (handler) => {
				mockFetcher(handler);
				return jest.fn(); // unsubscribe
			},
			enrich: false,
		},
		enrichedList: {
			fetcher: (handler) => {
				handler([
					{ id: 'app1', profile: 'prof1', completedBy: 'user1' },
					{ id: 'app2', profile: null },
				]);
				return jest.fn();
			},
			enrich: true,
		},
	},
}));

describe('useRealTimeList', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useAuth.mockReturnValue({ user: { uid: 'admin' }, member: true });
	});

	test('returns empty state if disabled', () => {
		const { result } = renderHook(() => useRealTimeList('testList', false));
		expect(result.current.data).toEqual([]);
		expect(result.current.loading).toBe(false);
	});

	test('fetches data using configured fetcher', async () => {
		// Setup the fetcher to return data immediately
		mockFetcher.mockImplementation((handler) => {
			handler([{ id: '1', name: 'Test Item' }]);
			return jest.fn();
		});

		const { result } = renderHook(() => useRealTimeList('testList', true));

		// Because it's a custom hook with internal state updates,
		// we might need to wait for the initial "loading=true" cycle to pass if data comes fast.
		// But usually, we just want to verify the end state.

		await waitFor(() => {
			expect(result.current.data).toHaveLength(1);
		});

		expect(result.current.data[0].name).toBe('Test Item');
		expect(result.current.loading).toBe(false);
	});

	test('enriches data by fetching profiles', async () => {
		getCollectionData.mockResolvedValue({
			applicantFirstName: 'John',
			applicantLastName: 'Doe',
		});

		const { result } = renderHook(() => useRealTimeList('enrichedList', true));

		await waitFor(() => {
			const enrichedItem = result.current.data.find((i) => i.id === 'app1');
			expect(enrichedItem).toHaveProperty('applicantName', 'John Doe');
		});

		const noProfileItem = result.current.data.find((i) => i.id === 'app2');
		expect(noProfileItem.applicantName).toBe('Unknown Applicant');
	});
});
