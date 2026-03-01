import { renderHook, act, waitFor } from '@testing-library/react';
import { useAssetActionHandler } from './useAssetActionHandler';
import { changeUserEmail } from '../config/data/firebase';

// Mock dependencies
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
}));

// Mock Contexts
const mockShowDialog = jest.fn();
jest.mock('../context/DialogContext', () => ({
	useDialog: () => ({ showDialog: mockShowDialog }),
}));

const mockShowAlert = jest.fn();
const mockHandleError = jest.fn();
jest.mock('../context/AlertContext', () => ({
	useAlert: () => ({ showAlert: mockShowAlert, handleError: mockHandleError }),
}));

// Mock Firebase Function
jest.mock('../config/data/firebase', () => ({
	changeUserEmail: jest.fn(),
}));

jest.mock('../config/navigation/routeUtils', () => ({
	generatePath: (path, params) => `/mocked/${path}/${params.id}`,
}));

describe('useAssetActionHandler', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('handles navigation actions', () => {
		const { result } = renderHook(() => useAssetActionHandler());

		const action = {
			navTo: (asset) => ({ path: 'edit', params: { id: asset.id } }),
		};
		const asset = { id: '123' };

		act(() => {
			result.current(action, asset);
		});

		expect(mockNavigate).toHaveBeenCalledWith('/mocked/edit/123');
	});

	test('handles standard onClick actions', () => {
		const { result } = renderHook(() => useAssetActionHandler());
		const mockClick = jest.fn();

		const action = { onClick: mockClick };

		act(() => {
			result.current(action, {});
		});

		expect(mockClick).toHaveBeenCalled();
	});

	test('handles dialog actions (changeLoginEmail)', async () => {
		const { result } = renderHook(() => useAssetActionHandler());
		const asset = { id: 'user123' };
		const action = { dialogId: 'changeLoginEmail' };

		// 1. Trigger the action
		act(() => {
			result.current(action, asset);
		});

		// 2. Expect dialog to open
		expect(mockShowDialog).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'changeLoginEmail',
			})
		);

		// 3. Simulate the dialog callback (User enters email and clicks Confirm)
		const dialogCallArgs = mockShowDialog.mock.calls[0][0];
		const dialogCallback = dialogCallArgs.callback;

		changeUserEmail.mockResolvedValue({}); // Success mock

		await act(async () => {
			await dialogCallback({ newEmail: 'new@test.com' });
		});

		// 4. Verify Firebase call and success alert
		expect(changeUserEmail).toHaveBeenCalledWith({ uid: 'user123', newEmail: 'new@test.com' });
		expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
	});

	test('handles dialog errors', async () => {
		const { result } = renderHook(() => useAssetActionHandler());
		const asset = { id: 'user123' };
		const action = { dialogId: 'changeLoginEmail' };

		act(() => {
			result.current(action, asset);
		});

		const dialogCallback = mockShowDialog.mock.calls[0][0].callback;
		const error = new Error('Firebase fail');
		changeUserEmail.mockRejectedValue(error);

		await act(async () => {
			await dialogCallback({ newEmail: 'bad@test.com' });
		});

		expect(mockHandleError).toHaveBeenCalledWith(error, 'updateLoginEmail');
	});
});
