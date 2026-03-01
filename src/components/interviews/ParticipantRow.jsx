/**
 * Participant Row
 * Represents a single user in the Admin Drawer's participant list.
 * Features:
 * - Displays user name and status.
 * - Admin Controls: Mute Audio, Stop Video, Eject Participant.
 * - Local User Indicator ("You").
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useParticipantProperty, useLocalSessionId, useDaily } from '@daily-co/daily-react';
import { Box, Typography, IconButton, Tooltip, Chip } from '@mui/material';
import { Mic, MicOff, Videocam, VideocamOff, Eject } from '@mui/icons-material';

// Context
import { useAlert } from '../../context/AlertContext';

const ParticipantRow = ({ id, isAdmin }) => {
	const callObject = useDaily();
	const { showAlert } = useAlert();
	const localSessionId = useLocalSessionId();

	// Fetch real-time participant state
	const userName = useParticipantProperty(id, 'user_name');
	const isAudioOff = useParticipantProperty(id, 'tracks.audio.state') === 'off';
	const isVideoOff = useParticipantProperty(id, 'tracks.video.state') === 'off';

	const isLocal = id === localSessionId;

	const toggleAudio = () => {
		// 'setAudio' toggles the track state for remote participants
		callObject.updateParticipant(id, { setAudio: isAudioOff });
		showAlert({ message: `${userName}'s microphone has been ${isAudioOff ? 'unmuted' : 'muted'}.`, type: 'info' });
	};

	const toggleVideo = () => {
		callObject.updateParticipant(id, { setVideo: isVideoOff });
		showAlert({ message: `${userName}'s camera has been ${isVideoOff ? 'enabled' : 'disabled'}.`, type: 'info' });
	};

	const ejectParticipant = () => {
		showAlert({ message: `Removing ${userName} from the call.`, type: 'warning' });
		callObject.updateParticipant(id, { eject: true });
	};

	let participantControls = null;

	if (isAdmin && !isLocal) {
		participantControls = (
			<>
				<Tooltip title={isAudioOff ? 'Ask to Unmute' : 'Mute Audio'}>
					<IconButton onClick={toggleAudio} size='small'>
						{isAudioOff ? <MicOff fontSize='small' /> : <Mic fontSize='small' />}
					</IconButton>
				</Tooltip>

				<Tooltip title={isVideoOff ? 'Ask to Start Video' : 'Stop Video'}>
					<IconButton onClick={toggleVideo} size='small'>
						{isVideoOff ? <VideocamOff fontSize='small' /> : <Videocam fontSize='small' />}
					</IconButton>
				</Tooltip>

				<Tooltip title='Eject from Call'>
					<IconButton onClick={ejectParticipant} color='error' size='small'>
						<Eject fontSize='small' />
					</IconButton>
				</Tooltip>
			</>
		);
	} else if (isLocal) {
		participantControls = <Chip label='You' size='small' variant='outlined' />;
	}

	return (
		<Box display='flex' alignItems='center' justifyContent='space-between' p={1} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
			<Typography variant='body2' noWrap sx={{ maxWidth: '140px' }}>
				{userName || 'Guest'}
			</Typography>
			<Box display='flex' gap={0.5}>
				{participantControls}
			</Box>
		</Box>
	);
};

ParticipantRow.propTypes = {
	id: PropTypes.string.isRequired,
	isAdmin: PropTypes.bool,
};

export default ParticipantRow;