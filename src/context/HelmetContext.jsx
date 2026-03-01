/**
 * SEO & PAGE TITLE CONTEXT
 * ---------------------------------------------------------------------------
 * This context manages the document <head> metadata (Title, Meta Tags, JSON-LD).
 *
 * * ARCHITECTURE:
 * 1. PageTitleProvider: Wraps the app. Holds the current page title state.
 * 2. PageHelmet: The component that actually renders the <Helmet> tags based on state.
 * 3. useTitle: The hook used by pages to set their title.
 * e.g. useTitle('Dashboard'); // Sets title to "Dashboard | Organization Name"
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';

// Global Configuration
import { brand } from '../config/Constants';

const PageTitleContext = createContext(null);

// =============================================================================
//  1. HELMET RENDERER (The <head> Manager)
// =============================================================================

/**
 * Renders the HTML <head> tags.
 * @param {string} title - The specific page title (e.g. "Login").
 * @param {boolean} appear - If true, allows search engines to index this page.
 */
const PageHelmet = ({ title, appear }) => {
	// Privacy Logic: If 'appear' is false, tell Google NOT to index this page.
	const robots = appear ? 'index, follow' : 'no-index, no-follow';
	const imageUrl = `${brand.url}${brand.ogImage}`; // Social preview image

	return (
		<Helmet>
			{/* --- 1. Basic Metadata --- */}
			<title>{`${title} | ${brand.organizationShortName}`}</title>
			<meta name='description' content={brand.metaDescription} />
			<meta name='keywords' content={brand.keywords} />
			<meta name='author' content={brand.metaAuthor} />
			<meta name='viewport' content='width=device-width, initial-scale=1' />

			{/* --- 2. Crawler Instructions --- */}
			<meta name='robots' content={robots} />

			{/* --- 3. Open Graph (Social Sharing Cards) --- */}
			<meta property='og:title' content={title} />
			<meta property='og:description' content={brand.shortDescription} />
			<meta property='og:type' content='website' />
			<meta property='og:url' content={brand.url} />
			<meta property='og:image' content={imageUrl} />
			<meta property='og:site_name' content={brand.organizationShortName} />
			<meta property='og:locale' content='en_US' />

			{/* --- 4. Structured Data (JSON-LD for Google Rich Results) --- */}
			<script type='application/ld+json'>
				{`
				{
					"@context": "https://schema.org",
					"@type": "Organization",
					"url": "${brand.url}",
					"logo": "${imageUrl}",
					"name": "${brand.organizationShortName}",
					"contactPoint": {
						"@type": "ContactPoint",
						"telephone": "${brand.contactTelephone}",
						"contactType": "${brand.contactType}"
					}
				}
			`}
			</script>

			{/* --- 5. PWA / Mobile Optimizations --- */}
			<meta name='mobile-web-app-capable' content='yes' />
			<meta name='theme-color' content={brand.themeColor} />
			<link rel='apple-touch-icon' href={brand.appleTouchIcon} />

			{/* --- 6. Caching Policies --- */}
			<meta httpEquiv='cache-control' content='max-age=31536000' />
		</Helmet>
	);
};

PageHelmet.propTypes = {
	title: PropTypes.string.isRequired,
	appear: PropTypes.bool.isRequired,
};

// =============================================================================
//  2. CONTEXT PROVIDER
// =============================================================================

export const PageTitleProvider = ({ children }) => {
	const [title, setTitle] = useState(brand.organizationShortName);
	const [appear, setAppear] = useState(true);

	const value = useMemo(() => ({ setTitle, setAppear }), [setTitle, setAppear]);

	return (
		<PageTitleContext.Provider value={value}>
			{/* The Helmet is rendered here, updated by the state above */}
			<PageHelmet title={title} appear={appear} />
			{children}
		</PageTitleContext.Provider>
	);
};

PageTitleProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

// =============================================================================
//  3. THE HOOK
// =============================================================================

/**
 * Hook to set the page title and SEO visibility.
 * usage: useTitle({ title: 'Dashboard', appear: false });
 *
 * @param {object} props
 * @param {string} props.title - The text to display in the browser tab.
 * @param {boolean} [props.appear=true] - If false, adds 'no-index' meta tag.
 */
export const useTitle = ({ title, appear }) => {
	const context = useContext(PageTitleContext);

	if (!context) {
		throw new Error('useTitle must be used within a PageTitleProvider');
	}

	const { setTitle, setAppear } = context;

	useEffect(() => {
		if (title) {
			setTitle(title);
		}
		if (appear !== undefined) {
			setAppear(appear);
		}
	}, [title, appear, setTitle, setAppear]);
};