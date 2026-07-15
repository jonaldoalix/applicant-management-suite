// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Box,
	Typography,
	Chip,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	CircularProgress,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ErrorOutlined, CheckCircleOutlined, HourglassEmpty } from '@mui/icons-material';
import { getEmailLogs } from '../../config/data/firebase';

const EmailLogsDialog = ({ onClose }) => {
	const [logs, setLogs] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchLogs = async () => {
			const data = await getEmailLogs(50);
			setLogs(data);
			setLoading(false);
		};
		fetchLogs();
	}, []);

	const getStatusIcon = (delivery) => {
		if (!delivery) return <HourglassEmpty color="warning" />;
		if (delivery.state === 'SUCCESS') return <CheckCircleOutlined color="success" />;
		if (delivery.state === 'ERROR') return <ErrorOutlined color="error" />;
		return <HourglassEmpty color="info" />;
	};

	const getStatusLabel = (delivery) => {
		if (!delivery) return 'QUEUED';
		return delivery.state || 'PROCESSING';
	};

	return (
		<>
			<DialogTitle>Email Delivery Logs (Last 50)</DialogTitle>
			<DialogContent>
				{loading ? (
					<Box display="flex" justifyContent="center" p={4}>
						<CircularProgress />
					</Box>
				) : logs.length === 0 ? (
					<Typography p={2}>No email logs found.</Typography>
				) : (
					<Box display="flex" flexDirection="column" gap={1} mt={1}>
						{logs.map((log) => (
							<Accordion key={log.id} variant="outlined" sx={{ bgcolor: 'background.paper' }}>
								<AccordionSummary expandIcon={<ExpandMoreIcon />}>
									<Box display="flex" alignItems="center" gap={2} width="100%">
										{getStatusIcon(log.delivery)}
										<Box flex={1}>
											<Typography variant="subtitle2" color="text.active">
												{log.message?.subject || '(No Subject)'}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												To: {log.to} {log.createdAt && ` | ${log.createdAt.toDate().toLocaleString()}`}
											</Typography>
										</Box>
										<Chip 
											size="small" 
											label={getStatusLabel(log.delivery)} 
											color={log.delivery?.state === 'SUCCESS' ? 'success' : log.delivery?.state === 'ERROR' ? 'error' : 'default'}
										/>
									</Box>
								</AccordionSummary>
								<AccordionDetails>
									<Box display="flex" flexDirection="column" gap={1}>
										<Typography variant="body2"><strong>From:</strong> {log.from}</Typography>
										{log.cc && log.cc.length > 0 && (
											<Typography variant="body2"><strong>CC:</strong> {log.cc.join(', ')}</Typography>
										)}
										<Typography variant="body2"><strong>Reply-To:</strong> {log.replyTo || 'None'}</Typography>
										
										{log.delivery?.error && (
											<Box mt={1} p={1} bgcolor="error.main" sx={{ opacity: 0.1, borderRadius: 1 }}>
												<Typography variant="caption" color="error" sx={{ fontWeight: 'bold' }}>
													Error Details:
												</Typography>
												<Typography variant="body2" color="error" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
													{log.delivery.error}
												</Typography>
											</Box>
										)}
										
										<Box mt={1}>
											<Typography variant="caption" color="text.secondary">
												Document ID: {log.id}
											</Typography>
										</Box>
									</Box>
								</AccordionDetails>
							</Accordion>
						))}
					</Box>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</>
	);
};

export default EmailLogsDialog;
