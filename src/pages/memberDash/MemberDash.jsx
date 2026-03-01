/**
 * ADMIN DASHBOARD (MemberDash)
 * ---------------------------------------------------------------------------
 * This is the main landing page for authenticated Committee Members.
 *
 * * ARCHITECTURE (THE DATA CONTROLLER):
 * This component is a "Shell" that orchestrates data fetching for child components.
 * 1. Layout Config: Reads 'memberDashContent' from 'src/config/admin'.
 * 2. Subscription Manager: Iterates through widgets/charts in the config,
 * executes their specific Firestore queries ('fetcher'), and stores the
 * results in a central state object ('dashboardData').
 * 3. Data Injection: Passes the live data down to dumb components via props.
 *
 * * CALCULATIONS:
 * - Real-time calculating of percentages (e.g. % of Total Applicants).
 * - Year-over-Year comparison logic for "Gain/Loss" indicators.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Box } from '@mui/material';

// Contexts
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { useAlert } from '../../context/AlertContext';

// Config & Components
import { memberDashContent as dashboardConfig } from '../../config/admin';
import Widget from '../../components/widget/Widget';
import Loader from '../../components/loader/Loader';

const MemberDash = () => {
	// --- Hooks & Contexts ---
	useTitle({ title: 'Dashboard', appear: false });
	const { boxShadow } = useTheme();
	const config = useConfig();
	const { showAnnouncement, handleError } = useAlert();

	// --- State ---
	const [loading, setLoading] = useState(true);
	// Central Store: { [componentId]: fetchedData }
	const [dashboardData, setDashboardData] = useState({});

	// --- Helper 1: Generic Data Fetcher ---
	// Sets up a listener for a specific component and updates local state on change.
	const setupDataFetcher = useCallback((comp) => {
		if (!comp.fetcher) {
			return null;
		}

		// Set initial state to avoid undefined errors during first render
		setDashboardData((prev) => ({ ...prev, [comp.id]: comp.initialState }));

		const handler = (data) => {
			setDashboardData((prev) => ({ ...prev, [comp.id]: data }));
		};

		return comp.fetcher(handler);
	}, []);

	// --- Helper 2: Widget Listener Setup ---
	// Widgets are complex: they need Current Data AND Historical Data (Comparison)
	const setupWidgetListeners = useCallback((widget, lastYearsDeadline, unsubs) => {
		// 1. Current Year Data
		if (widget.fetcher) {
			const unsub = widget.fetcher((count) => {
				setDashboardData((prev) => ({
					...prev,
					[widget.id]: { ...prev[widget.id], amount: count },
				}));
			});
			if (typeof unsub === 'function') unsubs.push(unsub);
		}

		// 2. Prior Year Data (for +/- trends)
		if (widget.comparisonFetcher) {
			const unsub = widget.comparisonFetcher(lastYearsDeadline.toISOString(), (count) => {
				setDashboardData((prev) => ({
					...prev,
					[widget.id]: { ...prev[widget.id], comparisonAmount: count },
				}));
			});
			if (typeof unsub === 'function') unsubs.push(unsub);
		}
	}, []);

	// --- Helper 3: Custom Row Listener Setup ---
	// Handles charts, tables, or complex layout blocks
	const setupCustomRowListeners = useCallback(
		(row, unsubs) => {
			if (row.type === 'customRow' && row.components) {
				for (const comp of row.components) {
					const unsub = setupDataFetcher(comp);
					if (typeof unsub === 'function') unsubs.push(unsub);
				}
			}
		},
		[setupDataFetcher]
	);

	// --- Effect 1: Global Announcements ---
	useEffect(() => {
		if (config.MEMBER_MESSAGE) {
			showAnnouncement({ message: config.MEMBER_MESSAGE });
		}
	}, [config.MEMBER_MESSAGE, showAnnouncement]);

	// --- Effect 2: Initialize Dashboard Data ---
	useEffect(() => {
		if (!config.APPLICATION_DEADLINE) return;

		setLoading(true);
		const unsubs = [];

		// Calculate "Last Year" reference date for comparisons
		const lastYearsDeadline = new Date(new Date(config.APPLICATION_DEADLINE).setFullYear(new Date(config.APPLICATION_DEADLINE).getFullYear() - 1));

		try {
			// A. Initialize Widgets
			for (const widget of dashboardConfig.widgets) {
				setupWidgetListeners(widget, lastYearsDeadline, unsubs);
			}

			// B. Initialize Layout Rows (Charts/Tables)
			for (const row of dashboardConfig.layout) {
				setupCustomRowListeners(row, unsubs);
			}
		} catch (error) {
			handleError(error, 'Dashboard Data Fetch');
		} finally {
			setLoading(false);
		}

		return () => {
			for (const unsub of unsubs) {
				unsub?.();
			}
		};
	}, [config.APPLICATION_DEADLINE, handleError, setupWidgetListeners, setupCustomRowListeners]);

	// --- Computed: Widget Statistics ---
	// Calculates percentages and trends derived from the raw data
	const widgetCalculations = useMemo(() => {
		const totals = {
			potentiallyEligible: 0,
			status: 0,
		};

		// 1. Sum Totals (Denominator)
		for (const widget of dashboardConfig.widgets) {
			const amount = dashboardData[widget.id]?.amount ?? 0;

			if (widget.category === 'potentiallyEligible') {
				totals.potentiallyEligible += amount;
			}
			// Special handling for Application Status widgets
			if (['New Application', 'Returning Grant', 'Scholarship'].includes(widget.id)) {
				totals.status += amount;
			}
		}

		const baseForStatus = totals.status > 0 ? totals.status : 1;

		// 2. Calculate Individual Metrics
		const infoMap = {};
		for (const widget of dashboardConfig.widgets) {
			const { amount = 0, comparisonAmount = 0 } = dashboardData[widget.id] ?? {};

			const total = widget.category === 'potentiallyEligible' ? totals.potentiallyEligible : baseForStatus;

			const percent = total > 0 ? Number.parseFloat(((amount / total) * 100).toFixed(2)) : 0;

			// Calculate Gain/Loss if function provided in config
			const gain = widget.isGainPositive ? widget.isGainPositive(amount, comparisonAmount) : null;

			infoMap[widget.id] = { amount, percent, gain };
		}

		return infoMap;
	}, [dashboardData]);

	if (loading) return <Loader />;

	return (
		<Box display='flex' flexDirection='column' gap={4} width='100%' sx={{ boxSizing: 'border-box', flex: 1 }}>
			{dashboardConfig.layout.map((row) => {
				// RENDER STRATEGY 1: Widget Strip
				if (row.type === 'widgets') {
					return (
						<Box key={row.id} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, width: '100%', alignItems: 'stretch', boxSizing: 'border-box' }}>
							{dashboardConfig.widgets.map((widget) => (
								<Widget key={widget.id} title={widget.title} linkText={widget.linkText} link={widget.link} IconComponent={widget.IconComponent} color={widget.color} isMoney={widget.isMoney} info={widgetCalculations[widget.id]} />
							))}
						</Box>
					);
				}

				// RENDER STRATEGY 2: Custom Component Row (Charts/Tables)
				if (row.type === 'customRow') {
					return (
						<Box key={row.id} display={row.display || 'flex'} gap={2} width='100%' alignItems='stretch' sx={row.containerSx}>
							{row.components.map((comp) => (
								<Box
									key={comp.id}
									sx={{
										display: 'flex',
										borderRadius: '12px',
										overflow: 'hidden',
										boxShadow: boxShadow,
										...comp.wrapperSx,
									}}>
									{/* Dynamic Component Injection */}
									{React.createElement(comp.component, {
										...comp.props,
										data: dashboardData[comp.id], // Inject fetched data here
									})}
								</Box>
							))}
						</Box>
					);
				}
				return null;
			})}
		</Box>
	);
};

export default MemberDash;