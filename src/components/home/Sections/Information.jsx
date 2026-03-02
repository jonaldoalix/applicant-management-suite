/**
 * Information Section (Home Page)
 * Renders the main content area with a two-level tab navigation system.
 * * Features:
 * - Parent Tabs: High-level categories (About, Requirements, Reach Out).
 * - Child Tabs: Specific sub-categories (e.g., under Requirements).
 * - Sticky Navigation: Tab bars stick to the top on scroll.
 * - Dynamic Content: Driven by 'homePageContent' config.
 */

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Box, Typography, Tab, Tabs, Chip, Divider, Grid } from '@mui/material';

// Config & Context
import { useConfig } from '../../../context/ConfigContext';
import { homePageContent } from '../../../config/content/content';

// --- Helper Components ---

// Consolidated TabPanel to handle both parent and child tab content
function TabPanel({ children, value, index, noPadding, ...other }) {
	return (
		<Box role='tabpanel' hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`} {...other}>
			{value === index && <Box py={noPadding ? 0 : { xs: 3, md: 3 }}>{children}</Box>}
		</Box>
	);
}

TabPanel.propTypes = {
	children: PropTypes.node,
	index: PropTypes.number.isRequired,
	value: PropTypes.number.isRequired,
	noPadding: PropTypes.bool,
};

// Accessibility helper
function getTabProps(index, prefix = 'tab') {
	return {
		id: `${prefix}-${index}`,
		'aria-controls': `${prefix}panel-${index}`,
	};
}

// --- Main Component ---

export default function BasicTabs({ tabBarRef, innerTabBarRef, parentTabBarValue, childTabBarValue, setParentTab, setChildTab }) {
	const [isSticky, setIsSticky] = useState(false);
	const siteConfig = useConfig();
	const deadline = siteConfig.APPLICATION_DEADLINE;
	const { information: content } = homePageContent;

	const handleParentChange = (event, newValue) => {
		setParentTab(newValue);
	};

	const handleChildChange = (event, newValue) => {
		setChildTab(newValue);
	};

	// Sticky Tab Logic
	useEffect(() => {
		const handleScroll = () => {
			const scrollPosition = window.scrollY;
			// Note: 1048 is a hardcoded threshold.
			// Consider calculating this dynamically via ref.current.offsetTop in the future.
			if (scrollPosition > 1048) {
				setIsSticky(true);
			} else {
				setIsSticky(false);
			}
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	return (
		<Box sx={{ width: '100%' }}>
			{/* Main Title Section */}
			<Box sx={{ pt: 8, m: 5, mt: 0, textAlign: 'center' }}>
				<Typography ref={tabBarRef} variant='h1' sx={{ fontSize: { xs: '3.75rem', sm: '4.5rem', lg: '6.75rem' } }}>
					{content.mainTitle}
				</Typography>
			</Box>

			{/* Parent Tabs (Sticky) */}
			<Box sx={{ borderBottom: 1, borderColor: 'divider' }} className={`sticky-tabs-container ${isSticky ? 'sticky' : ''}`}>
				<Tabs value={parentTabBarValue} onChange={handleParentChange} aria-label='main sections' centered>
					{content.tabs.map((tab, index) => (
						<Tab key={tab.label} label={tab.label} {...getTabProps(index, 'main')} />
					))}
				</Tabs>
			</Box>

			{/* 1. About Us Panel */}
			<TabPanel value={parentTabBarValue} index={0}>
				<Box sx={{ pt: 3 }} display='flex' flexDirection='column' alignItems='center' borderRadius='12px'>
					<Box sx={{ pb: 3 }}>
						<Typography variant='h2' component='h2' sx={{ fontSize: { xs: '2rem', sm: '2.5rem', lg: '4.75rem' } }}>
							{content.tabs[0].content.title}
						</Typography>
					</Box>
					<Box width={{ xs: '90vw', md: '70vw' }} alignSelf='center' paddingBottom={4}>
						{content.tabs[0].content.paragraphs.map((p) => (
							<Typography key={p} variant='subtitle1' component='p' dangerouslySetInnerHTML={{ __html: p }} sx={{ mb: 2 }} />
						))}
					</Box>
				</Box>
			</TabPanel>

			{/* 2. Requirements Panel (Nested Tabs) */}
			<TabPanel value={parentTabBarValue} index={1}>
				<Box id='tab-services' className='tab-content__item'>
					{/* Child Tabs (Sticky) */}
					<Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: { xs: 'flex-start', md: 'center' } }} className={`second-sticky-tabs-container ${isSticky ? 'sticky' : ''}`}>
						<Tabs value={childTabBarValue} onChange={handleChildChange} aria-label='service categories' variant='scrollable' scrollButtons='auto' allowScrollButtonsMobile>
							{content.tabs[1].content.childTabs.map((tab, index) => (
								<Tab key={tab.label} label={tab.label} {...getTabProps(index, 'child')} />
							))}
						</Tabs>
					</Box>

					{/* Child Content */}
					{content.tabs[1].content.childTabs.map((tab, index) => (
						<TabPanel key={tab.label} value={childTabBarValue} index={index} noPadding>
							<Box sx={{ pt: 10 }}>
								<Box textAlign='center' paddingBottom={3}>
									<Typography ref={innerTabBarRef} variant='h2' component='h2' sx={{ fontSize: { xs: '2rem', sm: '2.5rem', lg: '4.75rem' } }}>
										{tab.content.title}
									</Typography>
								</Box>

								{tab.content.introParagraphs.map((p) => (
									<Typography key={p} variant='subtitle1' component='p' dangerouslySetInnerHTML={{ __html: p }} />
								))}

								<br />
								<Typography variant='subtitle1' component='p'>
									{tab.content.deadlineMessage} <strong>{new Date(deadline).toLocaleDateString()}</strong>.
								</Typography>

								<Grid container spacing={5} paddingY={5}>
									{tab.content.requirements.map((item) => (
										<Grid item xs={12} sm={6} key={item.title}>
											<Box padding={2}>
												<Typography variant='h4' component='h4'>
													{item.title}
												</Typography>
												<Typography variant='subtitle1' component='p'>
													{item.description}
												</Typography>
											</Box>
										</Grid>
									))}
								</Grid>

								{tab.content.applyNowSection.enabled && (
									<Box display={{ xs: 'flex', md: 'none' }} flexWrap='wrap' justifyContent='space-evenly' paddingTop={3}>
										<Box py={3}>
											<Typography variant='h4' paddingBottom={3}>
												{tab.content.applyNowSection.title}
											</Typography>
											{tab.content.applyNowSection.paragraphs.map((p) => (
												<Typography key={p} variant='subtitle1' dangerouslySetInnerHTML={{ __html: p }} />
											))}
										</Box>
										<Box py={3} display='flex' flexDirection='column' gap={3}>
											{tab.content.applyNowSection.buttons.map((btn) => (
												<Button key={btn.label} variant='contained' href={btn.path}>
													{btn.label}
												</Button>
											))}
										</Box>
									</Box>
								)}
							</Box>
						</TabPanel>
					))}
				</Box>
			</TabPanel>

			{/* 3. Reach Out Panel */}
			<TabPanel value={parentTabBarValue} index={2}>
				<Box sx={{ pt: 3 }} display='flex' flexDirection='column' alignItems='center'>
					<Box sx={{ pb: 3 }} textAlign='center'>
						<Typography variant='h2' component='h2' sx={{ fontSize: { xs: '2rem', sm: '2.5rem', lg: '4.75rem' } }}>
							{content.tabs[2].content.title}
						</Typography>
						<Typography variant='subtitle1' component='p'>
							{content.tabs[2].content.subtitle}
						</Typography>
					</Box>
					<Box width='80vw' display='flex' flexDirection='row' flexWrap='wrap' textAlign='left' justifyContent='space-between' py={2}>
						{content.tabs[2].content.address.enabled && (
							<Box>
								<Typography variant='h4' component='h4'>
									{content.tabs[2].content.address.title}
								</Typography>
								<Typography variant='subtitle1' component='p'>
									{content.tabs[2].content.address.lines.map((line) => (
										<span key={line}>
											{line}
											<br />
										</span>
									))}
								</Typography>
							</Box>
						)}
						<Divider color='gray' width='2px' />
						<Box display='flex' flexDirection='column' gap={1}>
							{content.tabs[2].content.emails.enabled && (
								<>
									<Typography textAlign='center' variant='h4' component='h4'>
										{content.tabs[2].content.emails.title}
									</Typography>
									<Box display='flex' justifyContent='center' gap={3}>
										{content.tabs[2].content.emails.items.map((item) => (
											<Chip key={item.label} label={item.label} component='a' href={siteConfig[item.configKey]} variant='outlined' clickable />
										))}
									</Box>
								</>
							)}
							{content.tabs[2].content.phones.enabled && (
								<>
									<Typography textAlign='center' variant='h4' component='h4'>
										{content.tabs[2].content.phones.title}
									</Typography>
									<Box display='flex' justifyContent='center' gap={3}>
										{content.tabs[2].content.phones.items.map((item) => (
											<Chip key={item.label} label={item.label} component='a' href={siteConfig[item.configKey]} variant='outlined' clickable />
										))}
									</Box>
								</>
							)}
						</Box>
					</Box>
				</Box>
			</TabPanel>

			<hr />

			{/* Footer Section: Support Us & Apply Now */}
			{content.bottomSections.enabled && (
				<Box display='flex' flexDirection={{ xs: 'column-reverse', md: 'row' }} flexWrap='wrap' justifyContent='space-around' paddingY={6} marginX={{ xs: 0, md: 4 }} gap={4}>
					{content.bottomSections.supportUs.enabled && (
						<Box flex={1} minWidth='300px'>
							<Typography variant='h4' component='h4' paddingBottom={3}>
								{content.bottomSections.supportUs.title}
							</Typography>
							{content.bottomSections.supportUs.paragraphs.map((p, i) => (
								<Typography key={p} variant='subtitle1' component='p' sx={i === 1 ? { textAlign: 'center' } : {}}>
									{p}
								</Typography>
							))}
							<br />
							<Typography textAlign='center' variant='subtitle1' component='p'>
								<strong>
									{content.bottomSections.supportUs.mailTo.title}
									<br />
									<br />
									{content.bottomSections.supportUs.mailTo.lines.map((line) => (
										<span key={line}>
											{line}
											<br />
										</span>
									))}
								</strong>
							</Typography>
						</Box>
					)}
					{content.bottomSections.applyNow.enabled && (
						<Box flex={1} minWidth='300px' display={{ xs: parentTabBarValue === 1 ? 'none' : 'block', md: 'block' }}>
							<Typography variant='h4' component='h4' paddingBottom={3}>
								{content.bottomSections.applyNow.title}
							</Typography>
							<Typography variant='subtitle1' component='p'>
								{content.bottomSections.applyNow.paragraph}
							</Typography>
							<Box display='flex' flexDirection='column' gap={3} mt={3}>
								<Button size='large' variant='contained' href={content.bottomSections.applyNow.button.path}>
									{content.bottomSections.applyNow.button.label}
								</Button>
							</Box>
						</Box>
					)}
				</Box>
			)}
		</Box>
	);
}

BasicTabs.propTypes = {
	tabBarRef: PropTypes.object.isRequired,
	innerTabBarRef: PropTypes.object.isRequired,
	parentTabBarValue: PropTypes.number.isRequired,
	childTabBarValue: PropTypes.number.isRequired,
	setParentTab: PropTypes.func.isRequired,
	setChildTab: PropTypes.func.isRequired,
};
