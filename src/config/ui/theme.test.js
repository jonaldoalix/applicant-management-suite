// Do not import muiStyles here. We will require it inside beforeEach.
import { colors as importedColors } from './theme';

// Mock the createTheme function from MUI.
// We want to test the *config* object passed to it, not what MUI does with it.
// So, we mock it to just return the config object it receives.
jest.mock('@mui/material/styles', () => ({
	createTheme: jest.fn((config) => config), // Identity function
}));

// We need a variable to hold the default export
let theme;
// And one for the named colors export
let colors;
// This will hold our reference to the mock
let muiStyles;

describe('src/config/ui/theme.js', () => {
	// Store original process.env values
	const OLD_ENV = process.env;

	beforeEach(() => {
		// Reset modules to clear cache and re-evaluate the theme file for each test.
		// This is crucial for testing environment variables.
		jest.resetModules();

		// *** THIS IS THE FIX ***
		// Require the mock *after* resetting modules to get the new instance.
		muiStyles = require('@mui/material/styles');

		// We don't need to clear the mock since it's brand new every time,
		// but it's good practice in case this logic changes.
		muiStyles.createTheme.mockClear();

		// Restore original env
		process.env = { ...OLD_ENV };
	});

	afterAll(() => {
		// restore old env after all tests
		process.env = OLD_ENV;
	});

	it('should export correct colors with default environment variables', () => {
		// Dynamically import the module to capture its exports
		const themeModule = require('./theme');
		colors = themeModule.colors;

		// Test default (fallback) values
		expect(colors.black).toBe('#161C24');
		expect(colors.white).toBe('#F4F6F8');

		// Spot-check other colors
		expect(colors.red).toBe('#D32F2F');
		expect(colors.green).toBe('#2E7D32');
	});

	it('should use environment variables for colors when provided', () => {
		// Set custom env variables
		process.env.REACT_APP_PRELOAD_BG_DARK = '#222';
		process.env.REACT_APP_PRELOAD_BG_LIGHT = '#AAA';

		// Re-import the module *after* setting env vars
		const themeModule = require('./theme');
		colors = themeModule.colors;

		// Test that the env variables are used
		expect(colors.black).toBe('#222');
		expect(colors.white).toBe('#AAA');
	});

	it('should return a light theme configuration', () => {
		// Import default export
		theme = require('./theme').default;
		colors = require('./theme').colors;

		const primaryColor = 'red';
		const lightTheme = theme(false, primaryColor); // darkMode = false

		// Check that createTheme was called once (using the module reference)
		expect(muiStyles.createTheme).toHaveBeenCalledTimes(1);

		// Check palette mode
		expect(lightTheme.palette.mode).toBe('light');

		// Check primary color
		// Fallback to blue if the user selection is invalid
		const mainColor = colors[primaryColor] || colors.blue;
		expect(lightTheme.palette.primary.main).toBe(mainColor);

		// Check a light-mode-specific value
		expect(lightTheme.palette.background.main).toBe(colors.brightWhite);
		expect(lightTheme.palette.text.primary).toBe(colors.lightTextPrimary);

		// Check a common value
		expect(lightTheme.palette.error.main).toBe(colors.red);

		// Check a component override
		expect(lightTheme.components.MuiButton.defaultProps.variant).toBe('contained');
		expect(lightTheme.components.MuiCssBaseline.styleOverrides.body.backgroundColor).toBe(colors.white);
	});

	it('should return a dark theme configuration', () => {
		theme = require('./theme').default;
		colors = require('./theme').colors;

		const primaryColor = 'blue';
		const darkTheme = theme(true, primaryColor); // darkMode = true

		// Check that createTheme was called once (using the module reference)
		expect(muiStyles.createTheme).toHaveBeenCalledTimes(1);

		// Check palette mode
		expect(darkTheme.palette.mode).toBe('dark');

		// Check primary color
		expect(darkTheme.palette.primary.main).toBe(colors[primaryColor]);

		// Check a dark-mode-specific value
		expect(darkTheme.palette.background.main).toBe(colors.black);
		expect(darkTheme.palette.text.primary).toBe(colors.darkTextPrimary);

		// Check a common value
		expect(darkTheme.palette.success.main).toBe(colors.green);

		// Check a component override
		expect(darkTheme.components.MuiCssBaseline.styleOverrides.body.backgroundColor).toBe(colors.black);
		expect(darkTheme.components.MuiListItemText.styleOverrides.primary.color).toBe(colors.darkTextSecondary);
	});

	it('should use blue as the default primary color if an invalid color is passed', () => {
		theme = require('./theme').default;
		colors = require('./theme').colors;

		const lightTheme = theme(false, 'nonExistentColor');
		const darkTheme = theme(true, undefined);

		// Updated Expectation: Default is now BLUE, not GREEN
		expect(lightTheme.palette.primary.main).toBe(colors.blue);
		expect(darkTheme.palette.primary.main).toBe(colors.blue);

		expect(muiStyles.createTheme).toHaveBeenCalledTimes(2);
	});

	it('should contain all custom colors in the palette', () => {
		theme = require('./theme').default;
		// Use the imported colors const for comparison
		colors = require('./theme').colors;
		const lightTheme = theme(false, 'red');

		// Create an expected object that matches the *actual* (lowercase) keys
		// in the commonCustomColors object in theme.js
		const expectedCustomPalette = {
			brown: colors.brown,
			red: colors.red,
			black: colors.black,
			white: colors.white,
			offWhite: colors.offWhite,
			brightWhite: colors.brightWhite,
			yellow: colors.yellow,
			blue: colors.blue,
			green: colors.green,
			stwhite: colors.stWhite,
			stblack: colors.stBlack,
			lightBG: colors.lightBG,
			darkBG: colors.darkBG,
			lightTextPrimary: colors.lightTextPrimary,
			lightTextSecondary: colors.lightTextSecondary,
			darkTextPrimary: colors.darkTextPrimary,
			darkTextSecondary: colors.darkTextSecondary,
		};

		// Check if the custom color object matches the expected (lowercase-keyed) object
		expect(lightTheme.palette.custom).toEqual(expectedCustomPalette);
	});
});