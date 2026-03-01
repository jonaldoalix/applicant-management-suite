import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Information from './Information'; // Renamed to 'Information'
import { useConfig } from '../../../context/ConfigContext';
import { homePageContent } from '../../../config/content/content';

// Mock Dependencies
jest.mock('../../../context/ConfigContext', () => ({ useConfig: jest.fn() }));

// Mock content - needs to be a detailed skeleton
jest.mock('../../../config/content/content', () => ({
	homePageContent: {
		information: {
			mainTitle: 'Main Title',
			tabs: [
				{ label: 'About', content: { title: 'About Title', paragraphs: ['About p1'] } },
				{
					label: 'Requirements',
					content: {
						childTabs: [
							{
								label: 'Child Tab 1',
								content: {
									title: 'Child Title 1',
									introParagraphs: ['Child p1'],
									deadlineMessage: 'The deadline is',
									requirements: [{ title: 'Req 1', description: 'Req desc 1' }],
									applyNowSection: { enabled: false, buttons: [] },
								},
							},
						],
					},
				},
				{
					label: 'Contact',
					content: {
						title: 'Contact Title',
						subtitle: 'Contact Subtitle',
						address: { enabled: true, title: 'Address', lines: ['123 Main St'] },
						emails: { enabled: true, title: 'Emails', items: [{ label: 'Email 1', configKey: 'EMAIL_1' }] },
						phones: { enabled: true, title: 'Phones', items: [{ label: 'Phone 1', configKey: 'PHONE_1' }] },
					},
				},
			],
			bottomSections: { enabled: false },
		},
	},
}));

// Mock global scroll listener logic
global.window.addEventListener = jest.fn();
global.window.removeEventListener = jest.fn();

describe('Information (BasicTabs) Component', () => {
	const mockTabBarRef = { current: null };
	const mockInnerTabBarRef = { current: null };
	const mockSetParentTab = jest.fn();
	const mockSetChildTab = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useConfig.mockReturnValue({
			APPLICATION_DEADLINE: '2025-01-01T00:00:00Z',
			EMAIL_1: 'mailto:email1@test.com',
			PHONE_1: 'tel:1234567890',
		});
	});

	it('renders main title and tabs', () => {
		render(<Information tabBarRef={mockTabBarRef} innerTabBarRef={mockInnerTabBarRef} parentTabBarValue={0} childTabBarValue={0} setParentTab={mockSetParentTab} setChildTab={mockSetChildTab} />);

		expect(screen.getByText('Main Title')).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'About' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Requirements' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Contact' })).toBeInTheDocument();
	});

	it('renders the "About" panel when parentTabValue is 0', () => {
		render(<Information tabBarRef={mockTabBarRef} innerTabBarRef={mockInnerTabBarRef} parentTabBarValue={0} childTabBarValue={0} setParentTab={mockSetParentTab} setChildTab={mockSetChildTab} />);

		expect(screen.getByText('About Title')).toBeInTheDocument();
		expect(screen.getByText('About p1')).toBeInTheDocument();
	});

	it('renders the "Requirements" panel when parentTabValue is 1', () => {
		render(
			<Information
				tabBarRef={mockTabBarRef}
				innerTabBarRef={mockInnerTabBarRef}
				parentTabBarValue={1} // Set to show Requirements
				childTabBarValue={0}
				setParentTab={mockSetParentTab}
				setChildTab={mockSetChildTab}
			/>
		);

		// Check for child tab and its content
		expect(screen.getByRole('tab', { name: 'Child Tab 1' })).toBeInTheDocument();
		expect(screen.getByText('Child Title 1')).toBeInTheDocument();
		expect(screen.getByText('Req 1')).toBeInTheDocument();
		expect(screen.getByText(/The deadline is/)).toBeInTheDocument();
	});

	it('renders the "Contact" panel when parentTabValue is 2', () => {
		render(
			<Information
				tabBarRef={mockTabBarRef}
				innerTabBarRef={mockInnerTabBarRef}
				parentTabBarValue={2} // Set to show Contact
				childTabBarValue={0}
				setParentTab={mockSetParentTab}
				setChildTab={mockSetChildTab}
			/>
		);

		expect(screen.getByText('Contact Title')).toBeInTheDocument();
		expect(screen.getByText('Address')).toBeInTheDocument();
		expect(screen.getByText('123 Main St')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Email 1' })).toHaveAttribute('href', 'mailto:email1@test.com');
	});

	it('calls setParentTab when a main tab is clicked', () => {
		render(<Information tabBarRef={mockTabBarRef} innerTabBarRef={mockInnerTabBarRef} parentTabBarValue={0} childTabBarValue={0} setParentTab={mockSetParentTab} setChildTab={mockSetChildTab} />);

		fireEvent.click(screen.getByRole('tab', { name: 'Requirements' }));
		expect(mockSetParentTab).toHaveBeenCalledWith(1);
	});
});
