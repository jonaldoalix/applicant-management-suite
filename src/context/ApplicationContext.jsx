/**
 * APPLICATION FORM CONTEXT & STATE MANAGER
 * ---------------------------------------------------------------------------
 * This file manages the state, validation, and logic for the multi-step
 * Application Wizard.
 *
 * * ARCHITECTURE:
 * 1. ApplicationContextProvider: Wraps the form pages to provide global flags (loading, editing).
 * 2. useApplicationForm: A custom hook that acts as the "Controller". It:
 * - Initializes state (Blank vs. Existing Data).
 * - Handles Field Updates (Deeply nested objects).
 * - Performs Validation (Comparing data against 'formConfig.js').
 */

import { createContext, useState, useCallback, useMemo, useContext } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuid } from 'uuid';

// Config & Validation
import { lettersOnly, lettersAndSpacesOnly, numbersOnly, emailsOnly, decimalsOnly, locationOnly, notUndefined, blankApp } from '../config/data/Validation';
import { appFormConfig } from '../config/ui/formConfig';

export const ApplicationContext = createContext();

// --- Helper Utilities ---

/**
 * Safely retrieves a nested value from an object using a dot-notation string.
 * e.g., getNestedValue(formData, 'profileData.applicantFirstName')
 */
const getNestedValue = (obj, path, defaultValue = '') => {
	const value = path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
	return value === null || value === undefined ? defaultValue : value;
};

/**
 * Safely sets a nested value in an object, creating intermediate objects if needed.
 * returns the mutated object (intended for use inside state setters).
 */
const setNestedValue = (obj, path, value) => {
	const keys = path.split('.');
	let current = obj;
	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (current[key] === undefined || current[key] === null) {
			current[key] = {};
		}
		current = current[key];
	}
	current[keys.at(-1)] = value;
	return obj;
};

// --- Default Inputs for Array Fields ---
// These are used when a user clicks "Add Member" or "Add School" to reset the sub-form.
const defaultFamilyInput = { fullName: '', relation: '', age: '', occupation: '' };
const defaultSchoolInput = { school: '' };
const defaultexperienceInput = { type: '', number: '', location: '', highestRank: '' };
const defaultExpenseInput = { title: '', amount: '' };
const defaultIncomeInput = { title: '', amount: '' };
const defaultSiblingSchoolInput = { title: '', cost: '' };

// =============================================================================
//  1. CONTEXT PROVIDER
// =============================================================================

/**
 * Provides global state for the Application Controller (Loading status, Edit Mode).
 */
export const ApplicationContextProvider = ({ children }) => {
	const [loading, setLoading] = useState(true);
	const [allowEditing, setAllowEditing] = useState(false);
	const [applicationID, setApplicationID] = useState(null);

	const values = useMemo(
		() => ({
			loading,
			setLoading,
			allowEditing,
			setAllowEditing,
			applicationID,
			setApplicationID,
		}),
		[loading, allowEditing, applicationID]
	);

	return <ApplicationContext.Provider value={values}>{children}</ApplicationContext.Provider>;
};

ApplicationContextProvider.propTypes = {
	children: PropTypes.node,
};

// =============================================================================
//  2. VALIDATION ENGINE
// =============================================================================

const validators = {
	lettersOnly,
	lettersAndSpacesOnly,
	numbersOnly,
	emailsOnly,
	decimalsOnly,
	locationOnly,
	notUndefined,
};

/**
 * Validates flat fields in a section (e.g. Profile Name, DOB).
 */
const validateRegularFields = (sectionData, sectionDataKey, fields = []) => {
	const errors = {};
	let allValid = true;

	for (const field of fields) {
		if (!field.required) continue;

		const value = getNestedValue(sectionData, field.name, field.type === 'date' ? null : '');
		const validator = field.validator ? validators[field.validator] : null;

		// Valid if: Not empty AND (No validator function OR validator function returns true)
		const isFieldValid = value !== '' && value !== null && (!validator || validator(value));

		errors[`${sectionDataKey}.${field.name}`] = !isFieldValid;
		if (!isFieldValid) allValid = false;
	}
	return { errors, isValid: allValid };
};

/**
 * Validates a single item within an array (e.g., one family member).
 */
const validateArrayItem = (item, subFields, errorPathPrefix) => {
	const itemErrors = {};
	let isItemValid = true;

	for (const subField of subFields || []) {
		if (!subField.required) continue;

		const value = item[subField.name];
		const validator = subField.validator ? validators[subField.validator] : null;
		const isSubFieldValid = value !== '' && value !== null && value !== undefined && (!validator || validator(value));

		itemErrors[`${errorPathPrefix}.${subField.name}`] = !isSubFieldValid;
		if (!isSubFieldValid) {
			isItemValid = false;
		}
	}
	return { errors: itemErrors, isValid: isItemValid };
};

/**
 * Validates an entire array section (e.g. The list of all family members).
 */
const validateArrayField = (arrayFieldConfig, sectionData, sectionDataKey, sectionKey) => {
	if (!arrayFieldConfig) return { errors: {}, isValid: true };

	const errors = {};
	let allValid = true;
	const arrayName = arrayFieldConfig.name;
	const arrayData = sectionData[arrayName] || [];

	// Check if the list itself is required (must have at least 1 item)
	if (arrayFieldConfig.required && arrayData.length === 0) {
		errors[`${sectionDataKey}.${arrayName}`] = true;
		allValid = false;
	} else {
		errors[`${sectionDataKey}.${arrayName}`] = false;
	}

	// Check each item in the list
	for (const [index, item] of arrayData.entries()) {
		const errorPathPrefix = `${sectionDataKey}.${arrayName}.${index}`;
		const { errors: itemErrors, isValid: isItemValid } = validateArrayItem(item, arrayFieldConfig.fields, errorPathPrefix);

		Object.assign(errors, itemErrors);
		if (!isItemValid) {
			allValid = false;
		}
	}

	return { errors, isValid: allValid };
};

// =============================================================================
//  3. THE HOOK (Form Controller)
// =============================================================================

/**
 * The brain of the form. Manages state, updates, and validation.
 * @param {object} initialData - The application object from Firebase (or a blank template).
 */
export const useApplicationForm = (initialData = blankApp) => {
	// --- State Initialization (Hydration) ---
	const [formData, setFormData] = useState(() => {
		// Ensure IDs exist for all subsections (legacy data safety)
		const initialProfileID = initialData.profile || uuid();
		const initialFamilyID = initialData.family || uuid();
		const initialEducationID = initialData.education || uuid();
		const initialexperienceID = initialData.experience || uuid();
		const initialExpensesID = initialData.expenses || uuid();
		const initialIncomesID = initialData.incomes || uuid();
		const initialContributionsID = initialData.contributions || uuid();
		const initialProjectionsID = initialData.projections || uuid();
		const initialAttachmentsID = initialData.attachments || uuid();

		return {
			id: initialData.id || uuid(),

			// Reference IDs (Foreign Keys)
			profile: initialProfileID,
			family: initialFamilyID,
			education: initialEducationID,
			experience: initialexperienceID,
			expenses: initialExpensesID,
			incomes: initialIncomesID,
			contributions: initialContributionsID,
			projections: initialProjectionsID,
			attachments: initialAttachmentsID,

			// Data Sections (Hydrated with defaults to prevent null crashes)
			profileData: {
				applicantFirstName: initialData.profileData?.applicantFirstName || '',
				applicantMiddleInitial: initialData.profileData?.applicantMiddleInitial || '',
				applicantLastName: initialData.profileData?.applicantLastName || '',
				applicantDOB: initialData.profileData?.applicantDOB || null,
				applicantMailingAddress: initialData.profileData?.applicantMailingAddress || { description: '' },
				applicantHomePhone: initialData.profileData?.applicantHomePhone || '',
				applicantCellPhone: initialData.profileData?.applicantCellPhone || '',
				applicantEmailAddress: initialData.profileData?.applicantEmailAddress || '',
			},
			familyData: {
				familyMembers: initialData.familyData?.familyMembers || [],
				familyMembersInput: { ...defaultFamilyInput, ...initialData.familyData?.familyMembersInput },
			},
			educationData: {
				schoolName: initialData.educationData?.schoolName || '',
				major: initialData.educationData?.major || '',
				expectedGraduationDate: initialData.educationData?.expectedGraduationDate || null,
				currentGPA: initialData.educationData?.currentGPA || '',
				previousSchools: initialData.educationData?.previousSchools || [],
				previousSchoolsInput: { ...defaultSchoolInput, ...initialData.educationData?.previousSchoolsInput },
			},
			experienceData: {
				experiences: initialData.experienceData?.experiences || [],
				collegeReservesFlag: initialData.experienceData?.collegeReservesFlag || false,
				currentUnit: initialData.experienceData?.currentUnit ?? 'undefined',
				experiencesInput: { ...defaultexperienceInput, ...initialData.experienceData?.experiencesInput },
			},
			expensesData: {
				tuitionCost: initialData.expensesData?.tuitionCost || '',
				roomAndBoardCost: initialData.expensesData?.roomAndBoardCost || '',
				bookCost: initialData.expensesData?.bookCost || '',
				commutingCost: initialData.expensesData?.commutingCost || '',
				otherExpenses: initialData.expensesData?.otherExpenses || [],
				otherExpensesInput: { ...defaultExpenseInput, ...initialData.expensesData?.otherExpensesInput },
			},
			incomesData: {
				summerEarnings: initialData.incomesData?.summerEarnings || '',
				fallEarnings: initialData.incomesData?.fallEarnings || '',
				winterEarnings: initialData.incomesData?.winterEarnings || '',
				springEarnings: initialData.incomesData?.springEarnings || '',
				earningsAppliedToEducation: initialData.incomesData?.earningsAppliedToEducation || '',
				savingsAppliedToEducation: initialData.incomesData?.savingsAppliedToEducation || '',
				collegeAward: initialData.incomesData?.collegeAward || '',
				loansAmount: initialData.incomesData?.loansAmount || '',
				otherIncomeSources: initialData.incomesData?.otherIncomeSources || [],
				otherIncomeSourcesInput: { ...defaultIncomeInput, ...initialData.incomesData?.otherIncomeSourcesInput },
			},
			contributionsData: {
				p1ExpectedAnnualIncome: initialData.contributionsData?.p1ExpectedAnnualIncome || '',
				p2ExpectedAnnualIncome: initialData.contributionsData?.p2ExpectedAnnualIncome || '',
				parentInvestmentIncome: initialData.contributionsData?.parentInvestmentIncome || '',
				parentsOwnOrRentHome: initialData.contributionsData?.parentsOwnOrRentHome || '',
				parentsMaritalStatus: initialData.contributionsData?.parentsMaritalStatus || '',
				siblingSchools: initialData.contributionsData?.siblingSchools || [],
				anyExtraordinaryExpenses: initialData.contributionsData?.anyExtraordinaryExpenses || '',
				siblingSchoolsInput: { ...defaultSiblingSchoolInput, ...initialData.contributionsData?.siblingSchoolsInput },
			},
			projectionsData: {
				applicantEarnings: initialData.projectionsData?.applicantEarnings || '',
				applicantSavings: initialData.projectionsData?.applicantSavings || '',
				applicantFamily: initialData.projectionsData?.applicantFamily || '',
				request: initialData.projectionsData?.request || '',
			},
			attachmentsData: {
				attachmentsID: initialAttachmentsID,
				applicantPersonalLetter: initialData.attachmentsData?.applicantPersonalLetter || '',
				academicRecommendationLetter: initialData.attachmentsData?.academicRecommendationLetter || '',
				religiousRecommendationLetter: initialData.attachmentsData?.religiousRecommendationLetter || '',
				serviceRecommendationLetter: initialData.attachmentsData?.serviceRecommendationLetter || '',
				studentAidReport: initialData.attachmentsData?.studentAidReport || '',
				academicTranscript: initialData.attachmentsData?.academicTranscript || '',
				acceptanceLetter: initialData.attachmentsData?.acceptanceLetter || '',
			},
		};
	});

	const [errors, setErrors] = useState({});

	// --- Actions ---

	/**
	 * Updates a single field in the state.
	 * @param {string} sectionDataKey - e.g. 'profileData'
	 * @param {string} fieldPath - e.g. 'applicantFirstName' or nested 'address.zip'
	 * @param {any} value - The new value
	 */
	const updateField = useCallback((sectionDataKey, fieldPath, value) => {
		setFormData((prev) => {
			const newData = { ...prev };
			const section = { ...newData[sectionDataKey] }; // Shallow copy section

			setNestedValue(section, fieldPath, value); // Deep update

			newData[sectionDataKey] = section;
			return newData;
		});

		// Live Validation (Clear error if valid)
		const sectionKey = sectionDataKey.replace('Data', '');
		const sectionConfig = appFormConfig[sectionKey];
		const fieldConfig = sectionConfig?.fields?.find((f) => f.name === fieldPath) || sectionConfig?.arrayField?.fields?.find((f) => fieldPath.endsWith(`.${f.name}`));

		if (fieldConfig?.validator) {
			const validator = validators[fieldConfig.validator];
			const isValid = !value || validator?.(value);
			setErrors((prevErrors) => ({
				...prevErrors,
				[`${sectionDataKey}.${fieldPath}`]: !isValid,
			}));
		} else {
			// If no validator, just clear any previous error
			setErrors((prevErrors) => ({
				...prevErrors,
				[`${sectionDataKey}.${fieldPath}`]: false,
			}));
		}
	}, []);

	const updateSection = useCallback((sectionDataKey, data) => {
		setFormData((prev) => ({
			...prev,
			[sectionDataKey]: { ...prev[sectionDataKey], ...data },
		}));
	}, []);

	/**
	 * Validates the current step before allowing navigation to the next.
	 * @param {number} stepIndex - The current active step index.
	 * @param {string[]} steps - Array of step names ['profile', 'family', ...].
	 */
	const validateStep = useCallback(
		(stepIndex, steps) => {
			const sectionKey = steps[stepIndex].toLowerCase();
			const sectionDataKey = `${sectionKey}Data`;
			const sectionConfig = appFormConfig[sectionKey];

			if (!sectionConfig) {
				console.error(`No form configuration found for section: ${sectionKey}`);
				return false;
			}

			const currentSectionData = formData[sectionDataKey] || {};

			const regularFieldsResult = validateRegularFields(currentSectionData, sectionDataKey, sectionConfig.fields);
			const arrayFieldResult = validateArrayField(sectionConfig.arrayField, currentSectionData, sectionDataKey, sectionKey);

			const newErrors = { ...regularFieldsResult.errors, ...arrayFieldResult.errors };
			const isStepValid = regularFieldsResult.isValid && arrayFieldResult.isValid;

			setErrors((prevErrors) => ({ ...prevErrors, ...newErrors }));

			return isStepValid;
		},
		[formData]
	);

	const hasErrors = useMemo(() => Object.values(errors).some(Boolean), [errors]);

	return {
		formData,
		errors,
		updateField,
		updateSection,
		validateStep,
		hasErrors,
		setFormData,
	};
};

export const useApplicationContext = () => {
	const context = useContext(ApplicationContext);
	if (context === undefined) {
		throw new Error('useApplicationContext must be used within an ApplicationContextProvider');
	}
	return context;
};