import { renderHook, act } from '@testing-library/react';
import { useEmailActions } from './useEmailActions';
import { paths } from '../config/navigation/paths';

// Constants needed for mocking logic
const mockNavigate = jest.fn();
const mockMember = { alias: 'me@org.com', email: 'me@gmail.com' };

describe('useEmailActions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('handleReply navigates with correct state', () => {
		const { result } = renderHook(() => useEmailActions({ navigate: mockNavigate, member: mockMember }));

		const email = {
			id: '123',
			headerContent: {
				From: ['Sender Name <sender@test.com>'],
				Subject: ['Hello World'],
				Date: ['Mon, 01 Jan 2023'],
			},
			content: 'Original Body',
		};

		act(() => {
			result.current.handleReply(email);
		});

		expect(mockNavigate).toHaveBeenCalledWith(paths.composeEmail, {
			state: expect.objectContaining({
				to: ['sender@test.com'],
				subject: 'Re: Hello World',
				originalMessageId: '123',
			}),
		});
	});

	test('handleReplyAll filters out current user', () => {
		const { result } = renderHook(() => useEmailActions({ navigate: mockNavigate, member: mockMember }));

		const email = {
			id: '456',
			headerContent: {
				From: ['Boss <boss@test.com>'],
				To: ['me@org.com', 'coworker@test.com'], // me@org.com should be filtered
				Cc: ['me@gmail.com'], // me@gmail.com should be filtered
				Subject: ['Meeting'],
			},
			content: 'Body',
		};

		act(() => {
			result.current.handleReplyAll(email);
		});

		const callArgs = mockNavigate.mock.calls[0][1].state;

		expect(callArgs.to).toContain('boss@test.com');
		expect(callArgs.to).toContain('coworker@test.com');
		expect(callArgs.to).not.toContain('me@org.com');
		expect(callArgs.to).not.toContain('me@gmail.com');
	});

	test('handleForward sets subject prefix correctly', () => {
		const { result } = renderHook(() => useEmailActions({ navigate: mockNavigate, member: mockMember }));

		const email = {
			id: '789',
			headerContent: { Subject: ['Fwd: Existing Forward'] }, // Should not double add Fwd:
		};

		act(() => {
			result.current.handleForward(email);
		});

		const callArgs = mockNavigate.mock.calls[0][1].state;
		expect(callArgs.subject).toBe('Fwd: Existing Forward');
		expect(callArgs.to).toEqual([]); // Forward has empty TO
	});
});
