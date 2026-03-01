/**
 * VIDEO CONFERENCING CONTEXT (Daily.co)
 * ---------------------------------------------------------------------------
 * This context manages the integration with the Daily.co Video SDK.
 *
 * * ARCHITECTURE:
 * 1. MeetingProvider: Initializes the 'DailyIframe' engine (Call Object).
 * 2. Lifecycle Management: Ensures the call object is created once and destroyed
 * on unmount to prevent memory leaks or zombie connections.
 * 3. Device State: Persists camera/mic selection between the "Lobby" and the "Room".
 *
 * * USAGE:
 * const { callObject, videoDeviceId, setVideoDeviceId } = useMeeting();
 * callObject.join({ url: 'https://domain.daily.co/room-name' });
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import DailyIframe from '@daily-co/daily-js';

const MeetingContext = createContext(null);

export const MeetingProvider = ({ children }) => {
	// --- 1. Core Engine ---
	// Initialize the Daily Call Object only once on mount.
	// This is the main interface for joining, leaving, and managing the call.
	const [callObject] = useState(() => DailyIframe.createCallObject());

	// --- 2. Device Preferences ---
	// Store selected device IDs to persist choice from "Pre-Join" screen to "Active Call".
	const [videoDeviceId, setVideoDeviceId] = useState(null);
	const [audioDeviceId, setAudioDeviceId] = useState(null);

	// --- 3. User Metadata ---
	// Stores local user info (e.g. name) to pass into the meeting for other participants to see.
	const [participantDetails, setParticipantDetails] = useState({});

	// --- 4. Lifecycle Cleanup ---
	// Critical: Destroy the call engine when the provider unmounts (e.g. user logs out)
	useEffect(() => {
		return () => {
			callObject?.destroy();
		};
	}, [callObject]);

	const value = useMemo(
		() => ({
			callObject,
			// Video Input
			videoDeviceId,
			setVideoDeviceId,
			// Audio Input
			audioDeviceId,
			setAudioDeviceId,
			// Metadata
			participantDetails,
			setParticipantDetails,
		}),
		[callObject, videoDeviceId, audioDeviceId, participantDetails]
	);

	return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>;
};

MeetingProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

/**
 * Hook to access the Daily.co Call Object and device settings.
 */
export const useMeeting = () => {
	const context = useContext(MeetingContext);
	if (context === undefined) {
		throw new Error('useMeeting must be used within a MeetingProvider');
	}
	return context;
};