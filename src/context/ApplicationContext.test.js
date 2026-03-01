import React from 'react';
import { render, screen, renderHook, act } from '@testing-library/react';
import { ApplicationContextProvider, useApplicationContext, useApplicationForm } from './ApplicationContext';
import * as Validators from '../config/data/Validation';

// --- MOCKS ---

jest.mock('../config/data/Validation', () => ({
	lettersOnly: jest.fn(),
	notUndefined: jest.fn(),
	lettersAndSpacesOnly: jest.fn(),
	numbersOnly: jest.fn(),
	emailsOnly: jest.fn(),
	decimalsOnly: jest.fn(),
	locationOnly: jest.fn(),
	// Use a minimal blankApp to test default values logic
	blankApp: { id: null, profileData: {} },
}));

jest.mock('../config/ui/formConfig', () => ({
	appFormConfig: {
		profile: {
			fields: [
				{ name: 'applicantFirstName', validator: 'lettersOnly', required: true },
				{ name: 'optionalField', required: false },
			],
		},
		history: {
			// Section with an array field
			arrayField: {
				name: 'jobs',
				required: true,
				fields: [
					{ name: 'title', validator: 'lettersOnly', required: true },
					{ name: 'years', validator: 'numbersOnly', required: false }, // Optional sub-field
				],
			},
		},
		// FIX: Key must be lowercase because validateStep converts step names to lowercase
		optionalhistory: {
			// Optional array section
			arrayField: {
				name: 'hobbies',
				required: false,
				fields: [{ name: 'name', required: true }],
			},
		},
		emptysection: {
			// Section with no fields
		},
	},
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

describe('ApplicationContext', () => {
	// --- 1. Context Provider & Hook Safety ---
	describe('ApplicationContextProvider', () => {
		test('provides state values correctly', () => {
			const TestChild = () => {
				const { loading, setLoading, allowEditing, setAllowEditing, applicationID, setApplicationID } = useApplicationContext();
				return (
					<div>
						<span data-testid='loading'>{loading.toString()}</span>
						<span data-testid='editing'>{allowEditing.toString()}</span>
						<span data-testid='appID'>{String(applicationID)}</span>
						<button onClick={() => setLoading(false)}>Toggle Load</button>
						<button onClick={() => setAllowEditing(true)}>Toggle Edit</button>
						<button onClick={() => setApplicationID('123')}>Set ID</button>
					</div>
				);
			};

			render(
				<ApplicationContextProvider>
					<TestChild />
				</ApplicationContextProvider>
			);

			expect(screen.getByTestId('loading')).toHaveTextContent('true');

			act(() => {
				screen.getByText('Toggle Load').click();
			});
			expect(screen.getByTestId('loading')).toHaveTextContent('false');

			act(() => {
				screen.getByText('Toggle Edit').click();
			});
			expect(screen.getByTestId('editing')).toHaveTextContent('true');

			act(() => {
				screen.getByText('Set ID').click();
			});
			expect(screen.getByTestId('appID')).toHaveTextContent('123');
		});

		test('throws error when useApplicationContext is used outside provider', () => {
			// Suppress console.error for this expected failure
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

			expect(() => {
				renderHook(() => useApplicationContext());
			}).toThrow('useApplicationContext must be used within an ApplicationContextProvider');

			consoleSpy.mockRestore();
		});
	});

	// --- 2. useApplicationForm Hook Logic ---
	describe('useApplicationForm Hook', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			Validators.lettersOnly.mockReturnValue(true);
			Validators.numbersOnly.mockReturnValue(true);
		});

		// --- Initialization ---
		test('initializes with default values (blank app)', () => {
			const { result } = renderHook(() => useApplicationForm());
			const { formData } = result.current;

			expect(formData.id).toBe('test-uuid');
			// Check deeply nested defaults logic
			expect(formData.profileData.applicantFirstName).toBe('');
			expect(formData.educationData.schoolName).toBe('');
			expect(formData.experienceData.experiences).toEqual([]);
			expect(formData.experienceData.currentUnit).toBe('undefined');
		});

		test('initializes with provided initialData', () => {
			const mockInitData = {
				id: 'existing-id',
				profileData: { applicantFirstName: 'Jane' },
				experienceData: { currentUnit: '1' },
				// Ensure partial data doesn't crash and merges with defaults
				familyData: { familyMembers: [] },
			};

			const { result } = renderHook(() => useApplicationForm(mockInitData));
			const { formData } = result.current;

			expect(formData.id).toBe('existing-id');
			expect(formData.profileData.applicantFirstName).toBe('Jane');
			expect(formData.experienceData.currentUnit).toBe('1');
			// Check merging of nested defaults
			expect(formData.familyData.familyMembersInput.fullName).toBe('');
		});

		// --- Field Updates & Helper Functions ---
		test('updateField sets deeply nested values correctly', () => {
			const { result } = renderHook(() => useApplicationForm());

			act(() => {
				// Path logic: setNestedValue -> keys traversal
				result.current.updateField('profileData', 'address.city', 'New York');
			});

			expect(result.current.formData.profileData.address.city).toBe('New York');
		});

		test('updateField handles validation state (Success)', () => {
			const { result } = renderHook(() => useApplicationForm());
			Validators.lettersOnly.mockReturnValue(true);

			act(() => {
				result.current.updateField('profileData', 'applicantFirstName', 'John');
			});

			expect(result.current.formData.profileData.applicantFirstName).toBe('John');
			expect(result.current.errors['profileData.applicantFirstName']).toBe(false);
		});

		test('updateField handles validation state (Failure)', () => {
			const { result } = renderHook(() => useApplicationForm());
			Validators.lettersOnly.mockReturnValue(false);

			act(() => {
				result.current.updateField('profileData', 'applicantFirstName', '123');
			});

			expect(result.current.formData.profileData.applicantFirstName).toBe('123');
			expect(result.current.errors['profileData.applicantFirstName']).toBe(true);
		});

		test('updateSection merges section data', () => {
			const { result } = renderHook(() => useApplicationForm());

			act(() => {
				result.current.updateSection('profileData', { applicantFirstName: 'Alice', applicantLastName: 'Smith' });
			});

			expect(result.current.formData.profileData.applicantFirstName).toBe('Alice');
			expect(result.current.formData.profileData.applicantLastName).toBe('Smith');
		});

		// --- Validation Logic (validateStep) ---

		test('validateStep returns false if config is missing', () => {
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
			const { result } = renderHook(() => useApplicationForm());

			let isValid;
			act(() => {
				isValid = result.current.validateStep(0, ['NonExistentSection']);
			});

			expect(isValid).toBe(false);
			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No form configuration found'));
			consoleSpy.mockRestore();
		});

		test('validateStep validates Regular Fields (Required & Validator)', () => {
			const { result } = renderHook(() => useApplicationForm());

			// Case 1: Required field is empty -> Fail
			act(() => {
				result.current.validateStep(0, ['Profile']);
			});
			expect(result.current.errors['profileData.applicantFirstName']).toBe(true);

			// Case 2: Required field present but fails validator -> Fail
			Validators.lettersOnly.mockReturnValue(false);
			// Update and validate in separate acts to ensure state settles
			act(() => {
				result.current.updateField('profileData', 'applicantFirstName', '123');
			});
			act(() => {
				result.current.validateStep(0, ['Profile']);
			});
			expect(result.current.errors['profileData.applicantFirstName']).toBe(true);

			// Case 3: Required field valid -> Pass
			Validators.lettersOnly.mockReturnValue(true);
			act(() => {
				result.current.updateField('profileData', 'applicantFirstName', 'John');
			});
			act(() => {
				result.current.validateStep(0, ['Profile']);
			});
			expect(result.current.errors['profileData.applicantFirstName']).toBe(false);
		});

		test('validateStep validates Array Fields (Empty Required Array)', () => {
			const { result } = renderHook(() => useApplicationForm());

			// 'History' section has a required 'jobs' array. It is empty by default.
			let isValid;
			act(() => {
				isValid = result.current.validateStep(0, ['History']);
			});

			// Should fail because jobs array is empty and required=true
			expect(isValid).toBe(false);
			expect(result.current.errors['historyData.jobs']).toBe(true);
		});

		test('validateStep validates Array Items (Sub-fields)', () => {
			const { result } = renderHook(() => useApplicationForm());

			// Add an invalid item to the history array
			const invalidItem = { title: '', years: '' }; // Title is required

			act(() => {
				// Manually setting the array via updateSection for test setup
				result.current.updateSection('historyData', { jobs: [invalidItem] });
			});

			let isValid;
			act(() => {
				isValid = result.current.validateStep(0, ['History']);
			});

			expect(isValid).toBe(false);
			// Array itself is valid (length > 0), but item 0 is invalid
			expect(result.current.errors['historyData.jobs']).toBe(false);
			expect(result.current.errors['historyData.jobs.0.title']).toBe(true);
		});

		test('validateStep allows Optional Arrays and Fields', () => {
			const { result } = renderHook(() => useApplicationForm());

			// 'optionalhistory' array is not required. Empty is fine.
			let isValid;
			act(() => {
				isValid = result.current.validateStep(0, ['OptionalHistory']);
			});
			expect(isValid).toBe(true);

			// 'Profile' optionalField is not required.
			act(() => {
				result.current.updateField('profileData', 'applicantFirstName', 'John'); // Satisfy required
			});

			// Separate act ensures validateStep uses the updated 'John' value
			act(() => {
				// optionalField remains undefined/empty
				isValid = result.current.validateStep(0, ['Profile']);
			});
			expect(isValid).toBe(true);
		});

		test('hasErrors calculation updates correctly', () => {
			const { result } = renderHook(() => useApplicationForm());

			expect(result.current.hasErrors).toBe(false);

			act(() => {
				result.current.validateStep(0, ['Profile']); // Fails (firstname empty)
			});

			expect(result.current.hasErrors).toBe(true);
		});

		// --- Edge Cases & Branch Coverage ---

		test('setNestedValue handles creating new nested objects', () => {
			const { result } = renderHook(() => useApplicationForm());

			act(() => {
				// This triggers the `if (current[key] === undefined) current[key] = {}` branch
				result.current.updateField('profileData', 'deeply.nested.field', 'value');
			});

			expect(result.current.formData.profileData.deeply.nested.field).toBe('value');
		});

		test('getNestedValue handles null/undefined paths safely', () => {
			const { result } = renderHook(() => useApplicationForm());

			// Set a field to null manually to force getNestedValue to return defaultValue
			act(() => {
				result.current.updateSection('profileData', { applicantFirstName: null });
			});

			let isValid;
			act(() => {
				// Logic: getNestedValue(..., 'applicantFirstName', '') will return '' (defaultValue) if null
				// Then check required -> '' is fail.
				isValid = result.current.validateStep(0, ['Profile']);
			});

			expect(isValid).toBe(false);
		});
	});
});
