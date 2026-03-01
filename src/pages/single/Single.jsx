/**
 * GENERIC SINGLE ASSET VIEWER
 * ---------------------------------------------------------------------------
 * This component renders a read-only detail view for any data entity.
 *
 * * ARCHITECTURE:
 * 1. Config Lookup: Uses the 'type' prop (e.g. 'member') to find the display
 * configuration in 'src/config/admin/index.js' (under 'viewAsset').
 * 2. Data Fetching: Retrieves the specific document from Firestore based on
 * the URL parameter ':id'.
 * 3. Rendering: Delegates the actual UI rendering to the function defined
 * in 'currentConfig.renderComponent(data)'.
 *
 * * USAGE ROUTE:
 * <Route path="/admin/members/:id" element={<Single type="members" />} />
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import { Box } from '@mui/material';

// Backend & Context
import { getCollectionData } from '../../config/data/firebase';
import { useTitle } from '../../context/HelmetContext';
import { viewAsset as singleConfig } from '../../config/admin';

// Components
import NotFound from '../../components/layout/NotFound';
import Loader from '../../components/loader/Loader';

const Single = ({ type }) => {
	// --- State & Hooks ---
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const { id: dataID } = useParams();

	// --- Configuration Lookup ---
	const currentConfig = singleConfig[type];

	// --- SEO ---
	useTitle({
		title: currentConfig ? `View ${currentConfig.title}` : 'View',
		appear: false,
	});

	// --- Effect: Data Fetching ---
	useEffect(() => {
		// AbortController allows us to cancel the fetch if the component unmounts
		const controller = new AbortController();
		const signal = controller.signal;

		const fetchData = async () => {
			setLoading(true);

			if (currentConfig && dataID) {
				try {
					// Fetch the document based on the collection defined in config
					const fetchedData = await getCollectionData(dataID, currentConfig.collection, dataID);

					if (!signal.aborted) {
						setData(fetchedData);
						setLoading(false);
					}
				} catch (error) {
					console.error('Single View Fetch Error:', error);
					if (!signal.aborted) {
						setData(null);
						setLoading(false);
					}
				}
			} else if (!signal.aborted) {
				setData(null);
				setLoading(false);
			}
		};

		fetchData();

		// Cleanup function: Abort fetch if user navigates away
		return () => {
			controller.abort();
		};
	}, [dataID, type, currentConfig]);

	// --- Render States ---

	if (loading) {
		return <Loader />;
	}

	if (!currentConfig || !data) {
		return <NotFound />;
	}

	// --- Dynamic Render ---
	// The specific layout (e.g. Profile Card vs. Event Details) is defined in the config
	return (
		<Box className='single' display='flex' color='text.primary' height='100%' width='100%' flexDirection='column' mb={5} pb={5}>
			{currentConfig.renderComponent(data)}
		</Box>
	);
};

Single.propTypes = {
	type: PropTypes.string.isRequired, // matches a key in 'viewAsset'
};

export default Single;