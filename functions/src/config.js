/**
 * Global Configuration
 * Centralizes branding, collection names, and email templates.
 */

const brand = {
	theOrganizationName: 'The Application Management Suite',
	organizationName: 'Application Management Suite',
	organizationShortName: 'AMS',
	internalName: 'AMS',
	tagline: 'To facilitate the administration and review of applications, interviews, and deliberations.',
	organizationEstablished: 'City, State | Established 2000',
	url: 'https://ams.fullstackboston.com',
	dailyCoDomain: 'https://fullstackboston.daily.co',
	systemEmail: 'demo@fullstackboston.com',
	noreplyEmail: 'demo@fullstackboston.com',
};

const collections = {
	applications: 'applications',
	profiles: 'profiles',
	families: 'families',
	education: 'educationRecords',
	experience: 'experienceRecords',
	expenses: 'expenseReports',
	incomes: 'incomeReports',
	contributions: 'contributions',
	projections: 'projections',
	attachments: 'attachments',
	applicants: 'applicants',
	members: 'members',
	siteConfig: 'siteConfiguration',
	emails: 'emails',
	sms: 'sms',
	sitelog: 'sitelog',
	dblog: 'dblog',
	requests: 'requests',
	users: 'authUsers',
	awards: 'awards',
	interviews: 'interviews',
	interviewSignaling: 'interviewSignaling',
	mailCache: 'mail_cache',
	mailSync: 'mail_sync',
};

const ApplicationStatus = {
	started: 'Started',
	submitted: 'Submitted',
	completed: 'Completed',
	incomplete: 'Incomplete',
	eligible: 'Eligible',
	ineligible: 'Ineligible',
	invited: 'Invited',
	deferred: 'Deferred',
	awarded: 'Awarded',
	denied: 'Not Awarded',
	deleted: 'Deleted',
};

const configKeys = {
	configVersionId: 'bgmNDkiEFDERe24xxeiO',
};

const templates = {
	emailHeader: (brand) =>
		`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to ${brand.organizationShortName}</title></head><body style="width: 100%; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif;"><header><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px; margin-bottom: 20px; font-family: Arial, Helvetica, sans-serif;"><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 20px; border-radius: 5px;"><tr><td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333; padding: 10px;"><h1 style="font-size: 24px; color: #006B3F; margin: 0;">${brand.theOrganizationName}</h1><p style="font-size: 16px; color: #666666; margin: 5px 0 20px;">${brand.tagline}</p></td></tr><tr><td style="border-top: 2px solid #006B3F; padding-top: 10px;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #666666; text-align: center;">${brand.organizationEstablished}</p></td></tr></table></td></tr></table></header>`,

	staticEmailFooter: (brand) => `<footer><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px; margin-top: 20px; font-family: Arial, Helvetica, sans-serif;"><tr><td style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #666666; padding: 20px 0 10px; text-align: center;"><p>You are receiving this email because you opted in at our website.<br /><a href="#" style="color: #006B3F;">Privacy Policy</a></p><p>© ${new Date().getFullYear()} ${brand.theOrganizationName}. All rights reserved.</p></td></tr></table></footer></body></html>`,

	interviewInvitation: (brand, data) => {
		const rsvpYesLink = `${brand.url}/interviews/rsvp?interviewId=${data.interviewId}&response=yes`;
		const rsvpNoLink = `${brand.url}/interviews/rsvp?interviewId=${data.interviewId}&response=no`;

		const subject = `Interview Invite - ${brand.organizationShortName}`;
		const plainText = `Dear ${data.name}, Congratulations! The committee was very impressed with your application, and we are delighted to invite you to the final step in our selection process: a virtual interview. For more details on this, please check the email we have on file. We sincerely look forward to speaking with you. - The ${brand.organizationShortName}`;

		const content = `
            <main style="font-family: Arial, Helvetica, sans-serif; color: #333; padding: 5px; margin: 5px;">
                <h3>Your Application Was Selected!</h3>
                <p>Dear ${data.name},</p>
                <p>The committee was very impressed with your application, and after careful consideration, we are delighted to invite you to the final step in our selection process: a virtual interview.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <h4 style="color: #006B3F;">Interview Details</h4>
                <p><strong>Date:</strong> ${data.interviewDate}</p>
                <p><strong>Time:</strong> ${data.interviewTime}</p>
                <p><strong>Action Required:</strong> Please confirm your attendance below. An interview is required to be awarded any funding.</p>
                <p style="margin-bottom: 30px;"><strong>Click Button to RSVP:</strong> <a href="${rsvpYesLink}" style="padding: 12px 20px; border-radius: 5px; font-weight: bold; background-color: #4CAF50; color: white; text-decoration: none;">Confirm Attendance</a></p>
                <p><strong>Click To Request Exception:</strong> <a href="${rsvpNoLink}" style="padding: 12px 20px; background-color:rgb(179, 78, 53); color: white; text-decoration: none; border-radius: 5px;">I'm Unavailable</a></p>
                <p><strong>Add Interview to Calendar:</strong> <a href="${data.icsDownloadLink}" target="_blank" style="background-color: #111; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">➕ Add to Calendar</a></p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <h4 style="color: #006B3F;">What to Expect</h4>
                <ul>
                    <li>The interview will be a <strong>15-minute conversation</strong> with members of our scholarship committee.</li>
                    <li>Please click the button below to enter your private virtual waiting room <strong>5 minutes before</strong> your scheduled time.</li>
                </ul>
                <p style="text-align: center; margin: 25px 0;">
                    <a href="${data.waitingRoomURL}" style="background-color: #006B3F; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Join Interview Waiting Room</a>
                </p>
                <p>We sincerely look forward to speaking with you and learning more about your story.</p>
                <p>Best regards,<br>${brand.boardName || brand.organizationShortName}</p>
            </main>
        `;

		const htmlContent = templates.emailHeader(brand) + content + templates.staticEmailFooter(brand);
		return { subject, text: plainText, html: htmlContent };
	},

	rsvpConfirmationPage: (brand, response) => `
        <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 40px;">
            <h2>RSVP recorded as '${response === 'yes' ? 'CONFIRMED' : 'NOT AVAILABLE'}'.</h2>
            <p>Thank you!</p>
            <p><a href="${brand.url}" style="color: #006B3F;">Return to website</a></p>
            </body>
        </html>
    `,
};

module.exports = { brand, configKeys, templates, collections, ApplicationStatus };
