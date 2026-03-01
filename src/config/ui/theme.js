/**
 * MATERIAL UI THEME CONFIGURATION
 * ---------------------------------------------------------------------------
 * This file defines the visual design system for the application.
 * It controls Colors, Typography, and Global Component Styles.
 *
 * * FEATURES:
 * 1. Dark/Light Mode Support.
 * 2. Dynamic Primary Color (customizable via Settings).
 * 3. Centralized Component Overrides (DataGrid, Buttons, Inputs).
 */

import { createTheme } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';

// --- 1. Color Palette Definition ---

/**
 * The base color palette.
 * These hex codes are referenced throughout the theme configuration.
 */
export const colors = {
	// Semantic Colors
	red: '#D32F2F',
	blue: '#0288D1',
	green: '#2E7D32',
	yellow: '#C5A55D',
	brown: '#919EAB',

	// Neutrals & Backgrounds
	black: process.env.REACT_APP_PRELOAD_BG_DARK || '#161C24', // Deep Blue/Black for Dark Mode Backgrounds
	stBlack: '#212B36', // Slightly lighter black for cards/surfaces
	white: process.env.REACT_APP_PRELOAD_BG_LIGHT || '#F4F6F8', // Off-white for Light Mode Backgrounds
	offWhite: '#F4F6F8',
	stWhite: '#F4F6F8',
	brightWhite: '#FFFFFF', // Pure white

	// Text Colors
	lightBG: '#F4F6F8',
	darkBG: '#161C24',
	lightTextPrimary: '#212B36',
	lightTextSecondary: '#637381',
	darkTextPrimary: '#EDF2F7',
	darkTextSecondary: '#919EAB',
};

/**
 * Custom color tokens exposed to the `theme.palette` object.
 * Accessible in components via `theme.palette.custom.red`, etc.
 */
const commonCustomColors = {
	custom: {
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
	},
};

// --- 2. Theme Generator ---

/**
 * Generates the MUI Theme Options based on the selected mode and primary color.
 * @param {string} mode - 'light' | 'dark'
 * @param {string} primaryColor - Key from the `colors` object (e.g., 'green', 'blue').
 */
const getDesignTokens = (mode, primaryColor) => {
	// Fallback to blue if the user selection is invalid
	const mainColor = colors[primaryColor] || colors.blue;

	// --- A. Shared Configuration (Both Modes) ---
	const commonConfig = {
		palette: {
			...commonCustomColors,
			success: { main: colors.green },
			error: { main: colors.red },
			warning: { main: colors.yellow },
			info: { main: colors.blue },
		},
		components: {
			// Alerts
			MuiAlert: {
				styleOverrides: {
					root: { fontSize: '1.2rem', fontWeight: 'bold', padding: '1rem', borderRadius: '12px', textAlign: 'center' },
					standardSuccess: { backgroundColor: colors.green, color: colors.brightWhite },
					standardError: { backgroundColor: colors.red, color: colors.brightWhite },
					standardWarning: { backgroundColor: colors.yellow, color: colors.black },
					standardInfo: { backgroundColor: colors.blue, color: colors.brightWhite },
				},
			},
			// Buttons
			MuiButton: {
				defaultProps: { variant: 'contained', size: 'medium' },
			},
			// Lists
			MuiList: {
				styleOverrides: { root: { padding: 0 } },
			},
			MuiListItemIcon: {
				styleOverrides: { root: { minWidth: '30px', '&:hover': { color: colors.brightWhite } } },
			},
			// Tables (General)
			MuiTableCell: {
				styleOverrides: { body: { fontSize: '15px' } },
			},
			MuiTableHead: {
				styleOverrides: { root: { '& th': { fontWeight: 'bold', fontSize: '16px' } } },
			},
			MuiTableBody: {
				styleOverrides: { root: { '& tr:last-child td, & tr:last-child th': { borderBottom: 'none' } } },
			},
			// DataGrid (Complex Tables)
			MuiDataGrid: {
				styleOverrides: {
					root: {
						'& .MuiDataGrid-cell': { fontSize: '15px' },
						'& .MuiDataGrid-columnHeaders': { marginBottom: '12px' },
						'& .MuiDataGrid-columnHeaderTitle': {
							fontSize: '15px',
							fontFamily: 'Nunito, Arial, sans-serif',
							fontWeight: '500',
							letterSpacing: '0.5px',
						},
					},
				},
			},
		},
	};

	// --- B. Light Mode Configuration ---
	const lightConfig = {
		palette: {
			mode: 'light',
			primary: { main: mainColor },
			secondary: { main: colors.black },
			background: { main: colors.brightWhite, paper: colors.lightBG, passive: colors.white, seethru: colors.stWhite },
			highlight: { main: mainColor },
			text: {
				main: colors.brightWhite,
				light: colors.white,
				dark: colors.black,
				active: colors.black,
				primary: colors.lightTextPrimary,
				secondary: colors.lightTextSecondary,
				highlight: mainColor,
			},
			boxShadow: '2px 4px 10px 1px rgba(0, 0, 0, 0.47)',
		},
		components: {
			MuiCssBaseline: { styleOverrides: { body: { backgroundColor: colors.white, color: colors.black } } },
			MuiTab: { styleOverrides: { root: { color: colors.black, '&.Mui-selected': { color: mainColor } } } },
			// Inputs
			MuiTextField: {
				styleOverrides: {
					root: { '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: colors.black }, '&:hover fieldset': { borderColor: mainColor }, '&.Mui-focused fieldset': { borderColor: mainColor } } },
				},
			},
			MuiSelect: { styleOverrides: { root: { '& .MuiSvgIcon-root': { color: colors.black } }, select: { color: colors.black } } },
			MuiOutlinedInput: {
				styleOverrides: {
					root: {
						'&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: mainColor },
						'&:hover .MuiOutlinedInput-notchedOutline': { borderColor: mainColor },
						'.MuiOutlinedInput-notchedOutline': { borderColor: colors.black },
					},
					input: { '::placeholder': { color: colors.black, opacity: 1 } },
				},
			},
			MuiInputLabel: { styleOverrides: { root: { color: colors.black, '&.Mui-focused': { color: mainColor } } } },
			// Buttons
			MuiButton: {
				styleOverrides: {
					contained: {
						backgroundColor: mainColor,
						color: colors.brightWhite,
						'&:hover': { backgroundColor: colors.black, color: colors.brightWhite },
						'&.Mui-disabled': { backgroundColor: mainColor, color: colors.brightWhite, opacity: 0.5 },
					},
					outlined: { borderColor: colors.black, color: colors.black, '&:hover': { borderColor: mainColor, color: mainColor } },
					text: { color: colors.black, '&:hover': { backgroundColor: mainColor, color: colors.brightWhite } },
				},
			},
			// Data Display
			MuiCheckbox: { styleOverrides: { root: { color: colors.white, '&.Mui-checked': { color: mainColor }, '&.MuiCheckbox-indeterminate': { color: mainColor } } } },
			MuiListItemButton: {
				styleOverrides: { root: { margin: '0px', padding: '0px 5px', color: colors.lightTextSecondary, '&:hover': { backgroundColor: mainColor } } },
			},
			MuiListItemIcon: { styleOverrides: { root: { color: colors.lightTextSecondary, '&:hover': { color: colors.black } } } },
			MuiListItemText: {
				styleOverrides: {
					primary: { fontSize: '14px', fontWeight: 'bold', color: colors.lightTextPrimary, '&:hover': { color: colors.black } },
					secondary: { fontSize: '14px', fontWeight: 'bold', color: colors.lightTextPrimary, '&:hover': { color: colors.black } },
				},
			},
			// Tables
			MuiTableCell: { styleOverrides: { body: { color: colors.black } } },
			MuiTableHead: { styleOverrides: { root: { '& th': { color: colors.black } } } },
			MuiDataGrid: {
				styleOverrides: {
					root: {
						'& .MuiDataGrid-cell': { color: colors.black, borderColor: colors.white },
						'& .MuiDataGrid-columnHeaders': { backgroundColor: mainColor, color: 'white', borderColor: colors.white },
						'& .MuiDataGrid-row:hover': { backgroundColor: colors.offWhite, '& .MuiDataGrid-cell': { color: 'black', fontWeight: 'bold' } },
					},
				},
			},
		},
	};

	// --- C. Dark Mode Configuration ---
	const darkConfig = {
		palette: {
			mode: 'dark',
			primary: { main: mainColor },
			secondary: { main: colors.white },
			background: { main: colors.black, paper: colors.darkBG, seethru: colors.stBlack, passive: colors.black },
			highlight: { main: mainColor },
			text: {
				main: colors.white,
				active: colors.white,
				light: colors.white,
				dark: colors.black,
				primary: colors.darkTextPrimary,
				secondary: colors.darkTextSecondary,
				highlight: mainColor,
			},
			boxShadow: '2px 4px 10px 1px rgba(201, 201, 201, 0.47)',
		},
		components: {
			MuiCssBaseline: { styleOverrides: { body: { backgroundColor: colors.black, color: colors.white } } },
			MuiTab: { styleOverrides: { root: { color: colors.white, '&.Mui-selected': { color: mainColor } } } },
			// Inputs
			MuiTextField: {
				styleOverrides: {
					root: { '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: colors.white }, '&:hover fieldset': { borderColor: mainColor }, '&.Mui-focused fieldset': { borderColor: mainColor } } },
				},
			},
			MuiSelect: { styleOverrides: { root: { '& .MuiSvgIcon-root': { color: colors.white } }, select: { color: colors.white } } },
			MuiOutlinedInput: {
				styleOverrides: {
					root: {
						'&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: mainColor },
						'&:hover .MuiOutlinedInput-notchedOutline': { borderColor: mainColor },
						'.MuiOutlinedInput-notchedOutline': { borderColor: colors.brightWhite },
					},
					input: { '::placeholder': { color: colors.white, opacity: 1 } },
				},
			},
			MuiInputLabel: { styleOverrides: { root: { color: colors.white, '&.Mui-focused': { color: mainColor } } } },
			// Buttons
			MuiButton: {
				styleOverrides: {
					contained: {
						backgroundColor: mainColor,
						color: colors.black,
						'&:hover': { backgroundColor: colors.white, color: colors.black },
						'&.Mui-disabled': { backgroundColor: mainColor, color: colors.black, opacity: 0.5 },
					},
					outlined: { borderColor: colors.white, color: colors.white, '&:hover': { borderColor: mainColor, color: mainColor } },
					text: { color: colors.white, '&:hover': { backgroundColor: mainColor, color: colors.white } },
				},
			},
			// Data Display
			MuiCheckbox: { styleOverrides: { root: { color: colors.white, '&.Mui-checked': { color: mainColor }, '&.MuiCheckbox-indeterminate': { color: mainColor } } } },
			MuiListItemButton: {
				styleOverrides: { root: { margin: '0px', padding: '0px 5px', '&:hover': { backgroundColor: colors.stBlack } } },
			},
			MuiListItemIcon: { styleOverrides: { root: { color: colors.darkTextSecondary, '&:hover': { color: colors.brightWhite } } } },
			MuiListItemText: {
				styleOverrides: {
					primary: { fontSize: '14px', fontWeight: 'bold', color: colors.darkTextSecondary, '&:hover': { color: colors.brightWhite } },
					secondary: { fontSize: '14px', fontWeight: 'bold', color: colors.darkTextSecondary, '&:hover': { color: colors.brightWhite } },
				},
			},
			// Tables
			MuiTableCell: { styleOverrides: { body: { color: colors.white } } },
			MuiTableHead: { styleOverrides: { root: { '& th': { color: colors.white } } } },
			MuiDataGrid: {
				styleOverrides: {
					root: {
						'& .MuiDataGrid-cell': { color: colors.white },
						'& .MuiDataGrid-columnHeaders': { backgroundColor: colors.black, color: 'white', borderColor: colors.white },
						'& .MuiDataGrid-row:hover': { backgroundColor: colors.stBlack, '& .MuiDataGrid-cell': { color: 'white', fontWeight: 'bold' } },
					},
				},
			},
		},
	};

	const modeSpecificConfig = mode === 'light' ? lightConfig : darkConfig;

	// Deep merge combines the common config with the selected mode config
	return deepmerge(commonConfig, modeSpecificConfig);
};

// --- 3. Exported Theme Creator ---

/**
 * Creates the final MUI Theme object.
 * @param {boolean} darkMode - True for Dark Mode.
 * @param {string} primaryColor - Key of the primary color (e.g., 'green').
 */
const theme = (darkMode, primaryColor) => createTheme(getDesignTokens(darkMode ? 'dark' : 'light', primaryColor));

export default theme;