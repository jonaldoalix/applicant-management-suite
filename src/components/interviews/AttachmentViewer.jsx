/**
 * Attachment Viewer
 * Fetches and displays documents associated with an application.
 * Features:
 * - Fetches metadata from Firestore ('attachments' collection).
 * - Downloads files from Firebase Storage.
 * - Converts PDF blobs to images for inline rendering (using 'convertPDFBlobToImages').
 * - Handles standard images directly via Blob URLs.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';

// Firebase
import { ref, getBlob } from 'firebase/storage';
import { getCollectionData, storage } from '../../config/data/firebase';
import { collections } from '../../config/data/collections';

// Utils
import { convertPDFBlobToImages, createBlobUrl } from '../../config/Constants';

const PDFPreview = ({ displayName, pages }) => (
	<Box sx={{ mb: 4 }}>
		<Typography variant='h6' gutterBottom>
			{displayName}
		</Typography>
		{pages.map((page, index) => (
			<Box
				component='img'
				key={`${displayName}-${index}`} // Stable key based on index
				src={page}
				alt={`${displayName} - Page ${index + 1}`}
				sx={{
					width: '100%',
					maxWidth: '900px',
					marginBottom: '10px',
					border: '1px solid #ddd',
					display: 'block',
				}}
			/>
		))}
	</Box>
);

PDFPreview.propTypes = {
	displayName: PropTypes.string.isRequired,
	pages: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default function AttachmentViewer({ application }) {
	const [previews, setPreviews] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		let isMounted = true;

		const fetchPreviews = async () => {
			if (!application?.attachments || !application?.completedBy) return;

			setIsLoading(true);
			setError(null);

			try {
				// Fetch attachment metadata from Firestore
				const attachmentsData = await getCollectionData(application.completedBy, collections.attachments, application.attachments);

				if (!attachmentsData || Object.keys(attachmentsData).length === 0) {
					if (isMounted) setPreviews({});
					return;
				}

				const fetchedPreviews = {};

				// Process files in parallel
				await Promise.all(
					Object.entries(attachmentsData).map(async ([key, meta]) => {
						if (!meta?.refLoc) return;

						try {
							const blob = await getBlob(ref(storage, meta.refLoc));
							let pages = [];

							// Handle PDFs vs Images
							if (meta.displayName?.toLowerCase().endsWith('.pdf')) {
								pages = await convertPDFBlobToImages(blob);
							} else {
								const url = createBlobUrl(blob);
								pages = [url];
							}

							fetchedPreviews[key] = {
								displayName: meta.displayName || key,
								pages,
							};
						} catch (err) {
							console.error(`Failed to process attachment ${key}:`, err.message);
						}
					})
				);

				if (isMounted) setPreviews(fetchedPreviews);
			} catch (err) {
				console.error(err);
				if (isMounted) setError('Failed to load attachment data.');
			} finally {
				if (isMounted) setIsLoading(false);
			}
		};

		fetchPreviews();

		return () => {
			isMounted = false;
		};
	}, [application]);

	if (isLoading) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (error) {
		return <Alert severity='error'>{error}</Alert>;
	}

	if (previews && Object.keys(previews).length === 0) {
		return (
			<Typography variant='body2' color='text.secondary' align='center'>
				No attachments found.
			</Typography>
		);
	}

	return (
		<Box>
			<Typography variant='h5' gutterBottom sx={{ mt: 2 }}>
				Attachments
			</Typography>
			{previews && Object.entries(previews).map(([key, data]) => <PDFPreview key={key} displayName={data.displayName} pages={data.pages} />)}
		</Box>
	);
}

AttachmentViewer.propTypes = {
	application: PropTypes.object.isRequired,
};
