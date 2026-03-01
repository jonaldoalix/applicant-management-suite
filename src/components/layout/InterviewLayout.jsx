/**
 * Interview Layout
 * A specialized layout wrapper for the Interview subsystem.
 * Features:
 * - Wraps child routes in the MeetingProvider context.
 * - Ensures video call state management is available to all interview pages.
 */

import React from 'react';
import PropTypes from 'prop-types';

// Context
import { MeetingProvider } from '../../context/MeetingContext';

const InterviewLayout = ({ children }) => {
	return <MeetingProvider>{children}</MeetingProvider>;
};

InterviewLayout.propTypes = {
	children: PropTypes.node.isRequired,
};

export default InterviewLayout;