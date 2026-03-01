/**
 * Intro Section (Hero)
 * The landing view of the home page.
 * Features:
 * - Dynamic Background Image (Light/Dark mode).
 * - Welcome Text (from content config).
 * - "External Link" button (e.g., to a donation page or parent org).
 * - "Scroll Down" FAB to guide users to the content.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Button, Container, Typography, Box, Fab } from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

// Context & Config
import { useTheme } from '../../../context/ThemeContext';
import { homePageContent } from '../../../config/content/content';

// Components
import WindowInfo from '../../timer/WindowInfo';

export default function Intro({ appBarRef, topRef }) {
	const { darkMode } = useTheme();
	const { intro: content } = homePageContent;

	// Background images defined in config
	const lightModeHero = content?.backgroundImages?.light;
	const darkModeHero = content?.backgroundImages?.dark;

	const scrollToAppBar = () => {
		if (appBarRef?.current) {
			appBarRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	};

	if (!content) return null;

	return (
		<Container
			ref={topRef}
			maxWidth='xl'
			sx={{
				background: `url(${darkMode ? darkModeHero : lightModeHero})`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				width: '100%',
				height: '91vh',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
			}}>
			{/* Top Bar Area: External Link & Timer */}
			<Box>
				<Box display='flex' justifyContent='space-between' alignItems='center' flexDirection='row' flexWrap='nowrap' marginTop={1}>
					{content.externalLink?.enabled && (
						<Button
							href={content.externalLink.url}
							variant='contained'
							size='large'
							sx={{
								my: 2,
								boxShadow: '4px 4px 10px 3px rgba(0,0,0,0.75)',
								bgcolor: darkMode ? 'custom.darkBG' : 'custom.lightBG',
								color: darkMode ? 'text.light' : 'text.dark',
							}}>
							<Typography>{content.externalLink.label}</Typography>
						</Button>
					)}
					<Box display='flex' justifyContent='end'>
						{content.windowInfo?.enabled && <WindowInfo bg={'background.paper'} />}
					</Box>
				</Box>

				{/* Welcome Text */}
				{content.welcomeText?.enabled && (
					<Box display='flex' flexDirection='column' justifyContent='center' alignItems='start' gap='0'>
						<Typography color='text.light' variant='h4' fontSize={50} gutterBottom sx={{ textShadow: '4px 4px 4px rgba(0, 0, 0, 1)' }}>
							{content.welcomeText.line1}
						</Typography>
						<Typography
							color='text.light'
							variant='h1'
							gutterBottom
							sx={{
								fontFamily: 'marcellus',
								fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
								mb: '150px',
								textShadow: '4px 4px 4px rgba(0, 0, 0, 1)',
							}}>
							{content.welcomeText.line2}
						</Typography>
					</Box>
				)}
			</Box>

			{/* Scroll Down Button */}
			{content.scrollFab?.enabled && (
				<Fab
					variant='extended'
					size='large'
					color='background'
					aria-label='Scroll Down to Content'
					sx={{
						alignSelf: 'end',
						opacity: '0.8',
						mb: 1,
						display: { xs: 'none', md: 'flex' },
					}}
					onClick={scrollToAppBar}>
					<Typography color={'secondary'}>{content.scrollFab.label}</Typography>
					<ArrowDownwardIcon color='secondary' />
				</Fab>
			)}
		</Container>
	);
}

Intro.propTypes = {
	appBarRef: PropTypes.object.isRequired,
	topRef: PropTypes.object.isRequired,
};
