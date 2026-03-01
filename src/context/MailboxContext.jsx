/**
 * MAILBOX & INTERNAL EMAIL CONTEXT
 * ---------------------------------------------------------------------------
 * This context manages the internal messaging system (Zoho Mail Mirror).
 *
 * * HOW IT WORKS:
 * 1. Checks User Permissions: Determines which email aliases (e.g. 'admin', 'info')
 * the logged-in user is allowed to access.
 * 2. Real-Time Listener: Subscribes to the 'mail_cache' Firestore collection.
 * 3. Filtering: Only fetches emails that match the user's permitted aliases
 * and the currently selected folder (Inbox, Sent, Trash).
 *
 * * USAGE:
 * const { emails, unreadCount, selectedFolderId } = useMailbox();
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

// Backend & Auth
import { db } from '../config/data/firebase';
import { useAuth } from './AuthContext';

const MailboxContext = createContext();

export const MailboxProvider = ({ children }) => {
	// --- State ---
	const [emails, setEmails] = useState([]); // List of email objects
	const [permittedFolders, setPermittedFolders] = useState([]); // Folders user can see
	const [permittedAliases, setPermittedAliases] = useState([]); // Aliases user acts as

	// UI State
	const [selectedFolderId, setSelectedFolderId] = useState('inbox');
	const [selectedAliasFilter, setSelectedAliasFilter] = useState('all');
	const [loading, setLoading] = useState(true);

	const { member } = useAuth();

	// --- Effect 1: Permission Calculation ---
	// Determines what this user is allowed to see based on their 'member' profile.
	useEffect(() => {
		if (member?.permissions?.email) {
			// Extract allowed folders (e.g. ['inbox', 'sent'])
			const folders = Object.keys(member.permissions.emails?.folders || {}).filter((f) => member.permissions.emails.folders[f]);

			// Extract allowed aliases (e.g. ['admin', 'webmaster'])
			const groupAliases = Object.keys(member.permissions.emails?.aliases || {}).filter((a) => member.permissions.emails.aliases[a]);

			// Add user's personal alias (if they have one)
			const personalAlias = member.alias ? member.alias.split('@')[0].toLowerCase() : null;

			const allAliases = [...groupAliases];
			if (personalAlias && !allAliases.includes(personalAlias)) {
				allAliases.push(personalAlias);
			}

			// Sort alphabetically for the UI dropdown
			const sortedAliases = allAliases.toSorted((a, b) => a.localeCompare(b));

			setPermittedFolders((current) => (JSON.stringify(current) === JSON.stringify(folders) ? current : folders));
			setPermittedAliases((current) => (JSON.stringify(current) === JSON.stringify(sortedAliases) ? current : sortedAliases));

			// Ensure valid folder selection
			if (!selectedFolderId || !folders.includes(selectedFolderId)) {
				setSelectedFolderId(folders.includes('inbox') ? 'inbox' : folders[0] || '');
			}
		} else {
			// User has no email permissions
			setPermittedFolders([]);
			setPermittedAliases([]);
			setEmails([]);
			setLoading(false);
		}
	}, [member, selectedFolderId]);

	// --- Effect 2: Data Fetching (Real-Time) ---
	// Listens to Firestore based on the calculated permissions.
	useEffect(() => {
		if (!member?.permissions?.email || permittedAliases.length === 0 || !selectedFolderId) {
			setLoading(false);
			setEmails([]);
			return () => {};
		}

		setLoading(true);

		// Query Logic:
		// 1. Folder must match (e.g. 'inbox').
		// 2. Email must be tagged with one of the user's aliases (e.g. 'admin').
		// 3. Sort by newest first.
		const q = query(collection(db, 'mail_cache'), where('folderName', '==', selectedFolderId), where('tags', 'array-contains-any', permittedAliases), orderBy('timestamp', 'desc'));

		const unsubscribe = onSnapshot(
			q,
			(querySnapshot) => {
				const emailsData = [];
				for (const doc of querySnapshot.docs) {
					emailsData.push(doc.data());
				}
				setEmails(emailsData);
				setLoading(false);
			},
			(error) => {
				console.error('MailboxContext: Error listening to mail_cache:', error);
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, [member, permittedAliases, selectedFolderId]);

	const value = useMemo(
		() => ({
			emails,
			loading,
			permittedFolders,
			permittedAliases,
			selectedFolderId,
			setSelectedFolderId,
			selectedAliasFilter,
			setSelectedAliasFilter,
			member,
			unreadCount: emails.filter((e) => !e.isRead).length,
		}),
		[emails, loading, permittedFolders, permittedAliases, selectedFolderId, selectedAliasFilter, member]
	);

	return <MailboxContext.Provider value={value}>{children}</MailboxContext.Provider>;
};

MailboxProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

/**
 * Hook to access Mailbox state.
 */
export const useMailbox = () => useContext(MailboxContext);