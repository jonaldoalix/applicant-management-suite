import { renderHook } from '@testing-library/react';
import { useComposeEmailOptions } from './useComposeEmailOptions';

const DOMAIN = 'fullstackboston.com';

describe('useComposeEmailOptions', () => {
	test('generates fromOptions based on member permissions', () => {
		const mockMember = {
			alias: 'user@example.com', // Should strip domain
			permissions: {
				emails: {
					aliases: {
						info: true,
						finance: false, // Should be ignored
					},
				},
			},
		};

		const { result } = renderHook(() => useComposeEmailOptions({ member: mockMember, config: {}, fromAddress: null }));

		const options = result.current.fromOptions;
		// Expect 'info' and 'user'
		expect(options).toHaveLength(2);
		expect(options).toEqual(
			expect.arrayContaining([
				{ label: `info@${DOMAIN}`, value: `info@${DOMAIN}` },
				{ label: `user@${DOMAIN}`, value: `user@${DOMAIN}` },
			])
		);
	});

	test('generates signature options', () => {
		const mockMember = {
			alias: 'admin@domain.com',
			personalSignature: 'My Custom Sig',
			permissions: { emails: { aliases: { admin: true } } },
		};

		const mockConfig = {
			SIGNATURE_ADMIN: 'Official Admin Sig',
			SIGNATURE_OTHER: 'Hidden Sig', // Should not show if no permission
		};

		const { result } = renderHook(() => useComposeEmailOptions({ member: mockMember, config: mockConfig }));

		const sigs = result.current.signatureOptions;

		// 1. None, 2. Personal, 3. Admin (matched alias)
		expect(sigs).toHaveLength(3);
		expect(sigs[1].label).toBe('Personal Signature');
		expect(sigs[2].label).toBe('Admin Signature');
		expect(sigs[2].value).toBe('Official Admin Sig');
	});
});
