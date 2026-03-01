/**
 * My Notes Page
 * Displays a chronological list of all notes written by a specific member.
 * Features:
 * - Aggregates notes from Applicants and Applications.
 * - Deep links back to the "Topic" (Parent Entity).
 * - Visual indicators for "Private" vs "Committee" visibility.
 * - Handles redacted content display.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Box, Typography, Card, CardContent, Chip, Button } from '@mui/material';

// Context
import { useAuth } from '../../context/AuthContext';
import { useTitle } from '../../context/HelmetContext';

// Backend & Config
import { getNotesByAuthor } from '../../config/data/firebase';
import { collections } from '../../config/data/collections';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';

// Components
import Loader from '../loader/Loader';

// Init DayJS plugin
dayjs.extend(relativeTime);

const MyNotes = ({ id }) => {
	const [notes, setNotes] = useState([]);
	const [loading, setLoading] = useState(true);
	const { member } = useAuth();
	const navigate = useNavigate();

	useTitle({ title: 'My Notes' });

	useEffect(() => {
		const targetId = id || member?.id;

		const fetchNotes = async () => {
			if (!targetId) return;

			setLoading(true);
			try {
				const userNotes = await getNotesByAuthor(targetId);
				setNotes(userNotes);
			} catch (error) {
				console.error('Failed to fetch notes:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchNotes();
	}, [id, member]);

	const getParentPage = (note) => {
		if (!note.parent) return '#';

		if (note.parent.collection === collections.applications) {
			return generatePath(paths.viewApp, { id: note.parent.id });
		}
		if (note.parent.collection === collections.applicants) {
			return generatePath(paths.viewApplicant, { id: note.parent.id });
		}
		return '/';
	};

	if (loading) return <Loader />;

	return (
		<Box sx={{ p: 3 }}>
			<Typography variant='h4' gutterBottom>
				My Notes
			</Typography>
			<Typography variant='body1' sx={{ mb: 3, color: 'text.secondary' }}>
				A collection of all the committee and private notes you've written.
			</Typography>

			<Box display='flex' flexDirection='column' gap={2}>
				{notes.length === 0 ? (
					<Typography fontStyle='italic' color='text.secondary'>
						You haven't written any notes yet.
					</Typography>
				) : (
					notes.map((note) => (
						<Card
							key={note.id}
							variant='outlined'
							sx={{
								bgcolor: note.redacted ? 'action.disabledBackground' : 'background.paper',
								transition: '0.2s',
								'&:hover': { boxShadow: 2 },
							}}>
							<CardContent>
								{/* Header: Link to Parent & Visibility Chip */}
								<Box display='flex' justifyContent='space-between' alignItems='center' mb={1}>
									<Button size='small' variant='outlined' sx={{ p: 0.5, textTransform: 'none', justifyContent: 'flex-start' }} onClick={() => navigate(getParentPage(note))} disabled={!note.parent}>
										<Typography sx={{ pr: 0.5 }} variant='caption' color='text.secondary'>
											Topic:
										</Typography>
										<Typography variant='caption' fontWeight='bold'>
											{note.parent?.name || 'Unknown Entity'}
										</Typography>
									</Button>

									<Chip label={note.visibility} size='small' color={note.visibility === 'private' ? 'secondary' : 'primary'} variant='outlined' />
								</Box>

								{/* Body Content */}
								{note.redacted ? (
									<Typography fontStyle='italic' color='text.disabled' sx={{ py: 1 }}>
										[This note was redacted on {note.redactedOn?.toDate ? dayjs(note.redactedOn.toDate()).format('MM/DD/YYYY') : 'Unknown Date'}]
									</Typography>
								) : (
									<Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', color: 'text.primary' }}>
										{note.text}
									</Typography>
								)}

								{/* Footer: Timestamp */}
								<Typography variant='caption' display='block' color='text.secondary' sx={{ mt: 1, textAlign: 'right' }}>
									{note.createdAt?.toDate ? dayjs(note.createdAt.toDate()).fromNow() : ''}
								</Typography>
							</CardContent>
						</Card>
					))
				)}
			</Box>
		</Box>
	);
};

MyNotes.propTypes = {
	id: PropTypes.string,
};

export default MyNotes;
