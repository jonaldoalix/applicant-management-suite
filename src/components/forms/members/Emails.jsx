/**
 * Email Composition Form
 * Allows members to send emails (New, Reply, Forward) using the Zoho Mail API.
 * Supports:
 * - Dynamic "From" aliases based on permissions.
 * - Auto-populating fields for Replies/Forwards.
 * - Collapsible CC/BCC fields.
 * - Signatures and Branding toggles.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, TextField, Button, FormControl, InputLabel, Select, MenuItem, Autocomplete, Chip, Stack, Typography, CircularProgress, Collapse, FormControlLabel, Switch } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

// Context & Hooks
import { useMailbox } from '../../../context/MailboxContext';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import { useConfig } from '../../../context/ConfigContext';
import { useComposeEmailOptions } from '../../../hooks/useComposeEmailOptions';

// Backend
import { sendZohoEmail } from '../../../config/data/firebase';

export const EmailForm = () => {
	const { member } = useAuth();
	const config = useConfig();
	const { refreshMailbox } = useMailbox();
	const { showAlert, handleError } = useAlert();
	const navigate = useNavigate();
	const { state: navState } = useLocation();

	// Custom hook to load aliases and signatures based on member permissions
	const { fromOptions, signatureOptions, defaultFrom, permittedAliases } = useComposeEmailOptions({
		member,
		config,
		fromAddress: navState?.fromAddress,
	});

	const [isSending, setIsSending] = useState(false);

	// UI State
	const [showCc, setShowCc] = useState(!!navState?.cc);
	const [showBcc, setShowBcc] = useState(false);

	// Form Data
	const [fromAddress, setFromAddress] = useState(defaultFrom);
	const [to, setTo] = useState(navState?.to ? [navState.to].flat() : []);
	const [cc, setCc] = useState(navState?.cc ? [navState.cc].flat() : []);
	const [bcc, setBcc] = useState([]);
	const [subject, setSubject] = useState(navState?.subject || '');
	const [body, setBody] = useState('');
	const [signature, setSignature] = useState('none');
	const [useBranding, setUseBranding] = useState(false);

	// Update 'From' if default changes (e.g. after loading)
	useEffect(() => {
		setFromAddress(defaultFrom);
	}, [defaultFrom]);

	const handleSendEmail = async (e) => {
		e.preventDefault();

		if (!fromAddress || to.length === 0 || !subject) {
			showAlert({ message: 'Please fill in From, To, and Subject fields.', type: 'warning' });
			return;
		}

		setIsSending(true);

		// 1. Construct Body (Message + Signature + Quoted Text)
		const signatureHtml = signature && signature !== 'none' ? `<br><br>${signature}` : '';
		const bodyWithSignature = body + signatureHtml;
		const fullBody = bodyWithSignature + (navState?.htmlPreview || '');

		const emailPayload = {
			fromAddress: fromAddress,
			to,
			cc,
			bcc,
			subject,
			body: fullBody,
			useBranding: useBranding,
			originalMessageId: navState?.originalMessageId || null,
		};

		// 2. Send via Backend
		try {
			showAlert({ message: 'Sending email...', type: 'info' });
			await sendZohoEmail(emailPayload);
			showAlert({ message: 'Email sent successfully!', type: 'success' });
			refreshMailbox();
			navigate(-1);
		} catch (error) {
			handleError(error, 'Error sending email');
			setIsSending(false);
		}
	};

	// Guard: Wait for permissions to load
	if (!permittedAliases || permittedAliases.length === 0) {
		return (
			<Box display='flex' justifyContent='center' alignItems='center' height='300px'>
				<CircularProgress />
				<Typography ml={2}>Loading email configuration...</Typography>
			</Box>
		);
	}

	return (
		<Box
			component='form'
			onSubmit={handleSendEmail}
			sx={{
				borderRadius: 2,
				display: 'flex',
				flexDirection: 'column',
				gap: 2,
			}}>
			{/* --- FROM --- */}
			<FormControl fullWidth>
				<InputLabel id='from-alias-label'>From</InputLabel>
				<Select labelId='from-alias-label' value={fromAddress} label='From' onChange={(e) => setFromAddress(e.target.value)}>
					{fromOptions.map((option) => (
						<MenuItem key={option.value} value={option.value}>
							{option.label}
						</MenuItem>
					))}
				</Select>
			</FormControl>

			{/* --- TO (with toggles for CC/BCC) --- */}
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
				<Autocomplete multiple freeSolo options={[]} value={to} onChange={(event, newValue) => setTo(newValue)} renderTags={(value, getTagProps) => value.map((option, index) => <Chip variant='outlined' label={option} {...getTagProps({ index })} />)} renderInput={(params) => <TextField {...params} variant='outlined' label='To' placeholder='Add email addresses' />} sx={{ flexGrow: 1 }} />
				<Stack direction='row' spacing={0.5} sx={{ flexShrink: 0 }}>
					{!showCc && (
						<Button size='small' onClick={() => setShowCc(true)} sx={{ textTransform: 'none' }}>
							Cc
						</Button>
					)}
					{!showBcc && (
						<Button size='small' onClick={() => setShowBcc(true)} sx={{ textTransform: 'none' }}>
							Bcc
						</Button>
					)}
				</Stack>
			</Box>

			{/* --- CC (Conditionally Rendered) --- */}
			<Collapse in={showCc}>
				<Autocomplete multiple freeSolo options={[]} value={cc} onChange={(event, newValue) => setCc(newValue)} renderTags={(value, getTagProps) => value.map((option, index) => <Chip variant='outlined' label={option} {...getTagProps({ index })} />)} renderInput={(params) => <TextField {...params} variant='outlined' label='Cc' placeholder='Add email addresses' />} />
			</Collapse>

			{/* --- BCC (Conditionally Rendered) --- */}
			<Collapse in={showBcc}>
				<Autocomplete multiple freeSolo options={[]} value={bcc} onChange={(event, newValue) => setBcc(newValue)} renderTags={(value, getTagProps) => value.map((option, index) => <Chip variant='outlined' label={option} {...getTagProps({ index })} />)} renderInput={(params) => <TextField {...params} variant='outlined' label='Bcc' placeholder='Add email addresses' />} />
			</Collapse>

			{/* --- SUBJECT --- */}
			<TextField fullWidth label='Subject' value={subject} onChange={(e) => setSubject(e.target.value)} variant='outlined' />

			{/* --- BODY --- */}
			<TextField fullWidth label='Message' value={body} onChange={(e) => setBody(e.target.value)} variant='outlined' multiline rows={10} placeholder='Compose your message...' />

			{/* --- OPTIONS: SIGNATURE & BRANDING --- */}
			<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems='center'>
				<FormControl sx={{ flexGrow: 1, width: '100%' }}>
					<InputLabel>Include Signature</InputLabel>
					<Select name='signature' value={signature} label='Include Signature' onChange={(e) => setSignature(e.target.value)}>
						{signatureOptions.map((option) => (
							<MenuItem key={option.value} value={option.value}>
								{option.label}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<FormControlLabel control={<Switch name='useBranding' checked={useBranding} onChange={(e) => setUseBranding(e.target.checked)} />} label='Include Branded Header & Footer' sx={{ flexShrink: 0, minWidth: '280px' }} />
			</Stack>

			{/* --- QUOTED REPLY PREVIEW --- */}
			{navState?.htmlPreview && (
				<Box mt={0}>
					<Typography variant='caption' color='text.secondary'>
						Replying to:
					</Typography>
					<Box px={2} py={1} border='1px solid' borderColor='divider' borderRadius={1} sx={{ maxHeight: 200, overflowY: 'auto', opacity: 0.7 }}>
						<div dangerouslySetInnerHTML={{ __html: navState.htmlPreview }} />
					</Box>
				</Box>
			)}

			{/* --- ACTIONS --- */}
			<Stack direction='row' spacing={2} alignItems='center' justifyContent='flex-end' mt={1}>
				<Button variant='outlined' onClick={() => navigate(-1)} disabled={isSending}>
					Cancel
				</Button>
				<Button type='submit' variant='contained' disabled={isSending} startIcon={isSending ? <CircularProgress size={20} color='inherit' /> : <SendIcon />}>
					{isSending ? 'Sending...' : 'Send'}
				</Button>
			</Stack>
		</Box>
	);
};
