import React from 'react';
import { render, screen } from '@testing-library/react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RouteGuard, ApplicantsOnly, MembersOnly, Protected, Unprotected } from './router';
import { UserType } from '../data/collections';
import { generatePath } from './routeUtils';
import { paths } from './paths';

// Mock dependencies
jest.mock('../../context/AuthContext');
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: jest.fn(),
	Navigate: jest.fn(),
}));
jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader' />);

const mockUseAuth = useAuth;
const mockUseLocation = useLocation;
const MockNavigate = Navigate;

const TestChild = () => <div data-testid='test-child' />;

describe('router.js', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseLocation.mockReturnValue({ pathname: '/test-route' });
		MockNavigate.mockImplementation(({ to }) => <div data-testid='navigate-mock' data-to={to} />);
	});

	// --- RouteGuard ---
	describe('RouteGuard', () => {
		it('renders loader when auth is loading', () => {
			mockUseAuth.mockReturnValue({ loading: true });
			render(
				<RouteGuard>
					<TestChild />
				</RouteGuard>
			);
			expect(screen.getByTestId('loader')).toBeInTheDocument();
		});

		it('redirects to login if not authenticated and allowUnauthed is false', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: null });
			render(
				<RouteGuard>
					<TestChild />
				</RouteGuard>
			);
			expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
			expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', generatePath(paths.login));
		});

		it('renders children if not authenticated and allowUnauthed is true', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: null });
			render(
				<RouteGuard allowUnauthed={true}>
					<TestChild />
				</RouteGuard>
			);
			expect(screen.getByTestId('test-child')).toBeInTheDocument();
		});

		it('renders children if roles are not required', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: { uid: '123' }, role: UserType.member });
			render(
				<RouteGuard>
					<TestChild />
				</RouteGuard>
			);
			expect(screen.getByTestId('test-child')).toBeInTheDocument();
		});

		it('renders children if user has an allowed role', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: { uid: '123' }, role: UserType.member });
			render(
				<RouteGuard allowedRoles={[UserType.member]}>
					<TestChild />
				</RouteGuard>
			);
			expect(screen.getByTestId('test-child')).toBeInTheDocument();
		});

		it('redirects to access denied if user does not have an allowed role', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: { uid: '123' }, role: UserType.applicant });
			render(
				<RouteGuard allowedRoles={[UserType.member]}>
					<TestChild />
				</RouteGuard>
			);
			expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
			expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', generatePath(paths.caAccessDenied));
		});

		it('redirects to admin access denied for admin routes', () => {
			mockUseLocation.mockReturnValue({ pathname: '/members/dashboard' });
			mockUseAuth.mockReturnValue({ loading: false, user: { uid: '123' }, role: UserType.applicant });
			render(
				<RouteGuard allowedRoles={[UserType.member]}>
					<TestChild />
				</RouteGuard>
			);
			expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
			expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', generatePath(paths.adminAccessDenied));
		});

		it('renders children if user has required permissions (as admin)', () => {
			const member = { permissions: { admin: true } };
			mockUseAuth.mockReturnValue({ loading: false, user: { uid: '123' }, role: UserType.member, member });
			render(
				<RouteGuard permissions={['email']}>
					<TestChild />
				</RouteGuard>
			);
			expect(screen.getByTestId('test-child')).toBeInTheDocument();
		});

		it('renders children if user has required permissions (specific)', () => {
			const member = { permissions: { email: true } };
			mockUseAuth.mockReturnValue({ loading: false, user: { uid: '123' }, role: UserType.member, member });
			render(
				<RouteGuard permissions={['email']}>
					<TestChild />
				</RouteGuard>
			);
			expect(screen.getByTestId('test-child')).toBeInTheDocument();
		});

		it('redirects if user does not have required permissions', () => {
			const member = { permissions: { email: false } };
			mockUseAuth.mockReturnValue({ loading: false, user: { uid: '123' }, role: UserType.member, member });
			render(
				<RouteGuard permissions={['email']}>
					<TestChild />
				</RouteGuard>
			);
			expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
		});
	});

	// --- ApplicantsOnly ---
	describe('ApplicantsOnly', () => {
		it('renders loader while loading', () => {
			mockUseAuth.mockReturnValue({ loading: true });
			render(
				<ApplicantsOnly>
					<TestChild />
				</ApplicantsOnly>
			);
			expect(screen.getByTestId('loader')).toBeInTheDocument();
		});

		it('redirects if user is not logged in', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: null });
			render(
				<ApplicantsOnly>
					<TestChild />
				</ApplicantsOnly>
			);
			expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', generatePath(paths.redirect));
		});

		it('redirects if user is a member', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: { uid: '123' }, role: UserType.member, member: {} });
			render(
				<ApplicantsOnly>
					<TestChild />
				</ApplicantsOnly>
			);
			expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', generatePath(paths.redirect));
		});

		it('renders children if user is an applicant', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: { uid: '123' }, role: UserType.applicant, applicant: {} });
			render(
				<ApplicantsOnly>
					<TestChild />
				</ApplicantsOnly>
			);
			expect(screen.getByTestId('test-child')).toBeInTheDocument();
		});

		it('renders children if user is both', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: { uid: '123' }, role: UserType.both, applicant: {}, member: {} });
			render(
				<ApplicantsOnly>
					<TestChild />
				</ApplicantsOnly>
			);
			expect(screen.getByTestId('test-child')).toBeInTheDocument();
		});
	});

	// --- MembersOnly ---
	describe('MembersOnly', () => {
		it('redirects if user is an applicant', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: { uid: '123' }, role: UserType.applicant, applicant: {} });
			render(
				<MembersOnly>
					<TestChild />
				</MembersOnly>
			);
			expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', generatePath(paths.redirect));
		});

		it('renders children if user is a member', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: { uid: '123' }, role: UserType.member, member: {} });
			render(
				<MembersOnly>
					<TestChild />
				</MembersOnly>
			);
			expect(screen.getByTestId('test-child')).toBeInTheDocument();
		});
	});

	// --- Protected ---
	describe('Protected', () => {
		it('redirects if user is not logged in', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: null });
			render(
				<Protected>
					<TestChild />
				</Protected>
			);
			expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', generatePath(paths.login));
		});

		it('renders children if user is logged in', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: { uid: '123' } });
			render(
				<Protected>
					<TestChild />
				</Protected>
			);
			expect(screen.getByTestId('test-child')).toBeInTheDocument();
		});
	});

	// --- Unprotected ---
	describe('Unprotected', () => {
		it('renders children if user is not logged in', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: null });
			render(
				<Unprotected>
					<TestChild />
				</Unprotected>
			);
			expect(screen.getByTestId('test-child')).toBeInTheDocument();
		});

		it('redirects if user is logged in', () => {
			mockUseAuth.mockReturnValue({ loading: false, user: { uid: '123' } });
			render(
				<Unprotected>
					<TestChild />
				</Unprotected>
			);
			expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', generatePath(paths.redirect));
		});
	});
});
