import { lettersOnly, lettersAndSpacesOnly, numbersOnly, emailsOnly, decimalsOnly, locationOnly, notUndefined } from './Validation'; // Assuming the test file is in the same /config folder

// --- Regex Function Tests ---

describe('Validation: lettersOnly', () => {
	it('should return true for letters only', () => {
		expect(lettersOnly('HelloWorld')).toBe(true);
	});

	it('should return false for letters and numbers', () => {
		expect(lettersOnly('Hello123World')).toBe(false);
	});

	it('should return false for letters and spaces', () => {
		expect(lettersOnly('Hello World')).toBe(false);
	});

	it('should return true for an empty string', () => {
		// The regex '*' matches zero or more, so an empty string is valid
		expect(lettersOnly('')).toBe(true);
	});
});

describe('Validation: lettersAndSpacesOnly', () => {
	it('should return true for letters and spaces', () => {
		expect(lettersAndSpacesOnly('Hello World')).toBe(true);
	});

	it('should return false for letters, spaces, and numbers', () => {
		expect(lettersAndSpacesOnly('Hello World 123')).toBe(false);
	});

	it('should return true for an empty string', () => {
		expect(lettersAndSpacesOnly('')).toBe(true);
	});
});

describe('Validation: numbersOnly', () => {
	it('should return true for numbers only', () => {
		expect(numbersOnly('12345')).toBe(true);
	});

	it('should return false for numbers and letters', () => {
		expect(numbersOnly('12345a')).toBe(false);
	});

	it('should return false for decimals', () => {
		expect(numbersOnly('123.45')).toBe(false);
	});

	it('should return true for an empty string', () => {
		expect(numbersOnly('')).toBe(true);
	});
});

describe('Validation: emailsOnly', () => {
	it('should return true for a valid email', () => {
		expect(emailsOnly('test@example.com')).toBe(true);
	});

	it('should return false for an invalid email (missing @)', () => {
		expect(emailsOnly('testexample.com')).toBe(false);
	});

	it('should return false for an invalid email (missing .com)', () => {
		expect(emailsOnly('test@example')).toBe(false);
	});
});

describe('Validation: decimalsOnly', () => {
	it('should return true for an integer', () => {
		expect(decimalsOnly('123')).toBe(true);
	});

	it('should return true for a decimal number', () => {
		expect(decimalsOnly('123.45')).toBe(true);
	});

	it('should return true for a leading decimal', () => {
		expect(decimalsOnly('.45')).toBe(true);
	});

	it('should return false for non-numeric characters', () => {
		expect(decimalsOnly('123.45a')).toBe(false);
	});
});

describe('Validation: locationOnly', () => {
	it('should return true for "City, State" format', () => {
		expect(locationOnly('Boston, MA')).toBe(true);
	});

	it('should return true for "City-Name, State-Name" format', () => {
		expect(locationOnly('New-York, New-York')).toBe(true);
	});

	it('should return false for missing comma', () => {
		expect(locationOnly('Boston MA')).toBe(false);
	});

	it('should return false for extra characters', () => {
		expect(locationOnly('Boston, MA 123')).toBe(false);
	});
});

// --- Utility Function Tests ---

describe('Validation: notUndefined', () => {
	it('should return false for the string "undefined"', () => {
		expect(notUndefined('undefined')).toBe(false);
	});

	it('should return false for the type undefined', () => {
		expect(notUndefined(undefined)).toBe(false);
	});

	it('should return false for null', () => {
		expect(notUndefined(null)).toBe(false);
	});

	it('should return false for an empty string', () => {
		expect(notUndefined('')).toBe(false);
	});

	it('should return true for a valid string', () => {
		expect(notUndefined('Hello')).toBe(true);
	});

	it('should return true for the number 0', () => {
		expect(notUndefined(0)).toBe(true);
	});

	it('should return true for the boolean false', () => {
		expect(notUndefined(false)).toBe(true);
	});
});
