/**
 * PUBLIC LANDING PAGE
 * ---------------------------------------------------------------------------
 * This is the main entry point for unauthenticated visitors.
 *
 * * ARCHITECTURE:
 * 1. CMS-Driven: Sections (Intro, AppBar, Info, Footer) are conditionally rendered
 * based on 'homePageContent' in 'src/config/content/content.js'.
 * 2. State Lifting: The navigation state (which tab is active) is lifted up to this
 * parent component so the Header (AppBar) can control the Content (InfoSection).
 * 3. Scroll Management: Refs are passed down to allow smooth scrolling to specific
 * anchors (e.g. "Back to Top").
 */

import React, { useRef, useState } from 'react';
import { Container } from '@mui/material';

// Contexts
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';

// Config
import { homePageContent } from '../../config/content/content';

// Page Sections
import Intro from '../../components/home/Sections/Intro';
import ResponsiveAppBar from '../../components/home/Sections/ResponsiveAppBar';
import ResponsiveFooter from '../../components/home/Sections/ResponsiveFooter';
import InformationSection from '../../components/home/Sections/Information';

export default function Home() {
	// --- SEO ---
	useTitle({ title: 'Home', appear: true });

	// --- Theme ---
	const { darkMode } = useTheme();

	// --- Scroll Refs ---
	// Used to programmatically scroll to specific parts of the page
	const topRef = useRef(null); // Top of the page (for "Intro")
	const appBarRef = useRef(null); // The sticky navigation bar
	const tabBarRef = useRef(null); // The tab strip within the Info section
	const innerTabBarRef = useRef(null); // The content inside the tabs

	// --- Navigation State ---
	// value: The primary tab index (e.g. 0 = "About", 1 = "Donate")
	// secondValue: The sub-tab index (e.g. 0 = "Mission", 1 = "History")
	const [value, setValue] = useState(0);
	const [secondValue, setSecondValue] = useState(0);

	return (
		<>
			{/* 1. Hero / Intro Section */}
			{/* Renders the big splash image or video. Can be disabled via config. */}
			{homePageContent.intro.enabled && <Intro topRef={topRef} appBarRef={appBarRef} />}

			{/* 2. Navigation Bar */}
			{/* The Sticky Header. Controls the tabs in the section below. */}
			{homePageContent.appBar.enabled && <ResponsiveAppBar appBarRef={appBarRef} tabBarRef={tabBarRef} innerTabBarRef={innerTabBarRef} parentTabBarValue={value} childTabBarValue={secondValue} setParentTab={setValue} setChildTab={setSecondValue} />}

			{/* 3. Main Content Area */}
			{/* Renders the text content (History, FAQ, etc.) based on selected tabs. */}
			<Container
				maxWidth='xl'
				sx={{
					backgroundColor: darkMode ? 'custom.black' : 'custom.white',
					width: '100%',
					color: darkMode ? 'gray' : 'custom.black',
					minHeight: '50vh', // Ensure footer doesn't float up on empty pages
				}}>
				{homePageContent.information.enabled && <InformationSection tabBarRef={tabBarRef} innerTabBarRef={innerTabBarRef} parentTabBarValue={value} childTabBarValue={secondValue} setParentTab={setValue} setChildTab={setSecondValue} />}
			</Container>

			{/* 4. Footer */}
			{/* Contains Copyright, Social Links, and "Back to Top" button */}
			{homePageContent.footer.enabled && <ResponsiveFooter topRef={topRef} setParentTab={setValue} setChildTab={setSecondValue} />}
		</>
	);
}