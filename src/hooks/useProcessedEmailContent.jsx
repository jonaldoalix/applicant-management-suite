/**
 * EMAIL CONTENT HYDRATION HOOK
 * ---------------------------------------------------------------------------
 * This hook prepares raw email HTML for display in the browser.
 *
 * * THE PROBLEM:
 * Emails often embed images using "Content-IDs" (cid:) instead of URLs.
 * e.g. <img src="cid:image001">
 * Browsers cannot load these local references.
 *
 * * THE SOLUTION:
 * 1. Detects inline attachments in the email object.
 * 2. Fetches the binary content for each attachment from the backend.
 * 3. Replaces 'cid:' references with Base64 Data URLs.
 *
 * * USAGE:
 * const { processedContent, contentLoading } = useProcessedEmailContent(email);
 * <div dangerouslySetInnerHTML={{ __html: processedContent }} />
 */

import { useState, useEffect } from 'react';
import { fetchAttachmentContent } from '../config/data/firebase';

/**
 * Escapes characters that have special meaning in Regular Expressions.
 * Vital because attachment filenames often contain periods (image.png) or brackets.
 */
function escapeRegExp(string) {
	return string.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

export const useProcessedEmailContent = (email) => {
	const [processedContent, setProcessedContent] = useState('');
	const [contentLoading, setContentLoading] = useState(true);

	useEffect(() => {
		let isMounted = true; // Prevents state updates if component unmounts mid-fetch

		const processInlineAttachments = async () => {
			setContentLoading(true);

			// 1. Basic Validation
			if (!email?.content) {
				if (isMounted) {
					setProcessedContent('');
					setContentLoading(false);
				}
				return;
			}

			let htmlContent = email.content;

			// 2. Short Circuit: If no images to hydrate, return immediately
			if (!email?.inlineAttachments?.length) {
				if (isMounted) {
					setProcessedContent(htmlContent);
					setContentLoading(false);
				}
				return;
			}

			// 3. Fetch Data for all Inline Images (Parallel)
			const attachmentPromises = email.inlineAttachments.map(async (attachment) => {
				if (!attachment.cid) {
					console.warn('Skipping inline attachment with missing cid:', attachment);
					return null;
				}
				try {
					const result = await fetchAttachmentContent({
						messageId: email.id,
						attachmentId: attachment.attachmentId,
						folderId: email.folderId,
					});

					const data = result.data;
					// Create the renderable Base64 URL
					const dataUrl = `data:${data.contentType};base64,${data.content}`;

					// Clean up the CID string (sometimes wrapped in < > brackets)
					return { cid: attachment.cid.replaceAll(/[<>]/g, '').trim(), dataUrl: dataUrl };
				} catch (error) {
					console.error('Failed to fetch inline attachment:', error);
					return null;
				}
			});

			const resolvedAttachments = await Promise.all(attachmentPromises);

			// 4. Perform String Replacement (Injection)
			if (isMounted) {
				for (const att of resolvedAttachments.filter(Boolean)) {
					const escapedCid = escapeRegExp(att.cid);

					// Regex looks for: src="...cid=THE_CID..."
					// This handles variations in how different email clients format the src attribute
					const cidRegex = new RegExp(`src="[^"]*cid=${escapedCid}[^"]*"`, 'g');
					const replacementString = `src="${att.dataUrl}"`;

					htmlContent = htmlContent.replaceAll(cidRegex, replacementString);
				}

				setProcessedContent(htmlContent);
				setContentLoading(false);
			}
		};

		processInlineAttachments();

		return () => {
			isMounted = false;
		};
	}, [email]);

	return { processedContent, contentLoading };
};