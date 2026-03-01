/**
 * EMAIL TEMPLATE CONFIGURATION
 * ---------------------------------------------------------------------------
 * This file defines the content for all transactional emails sent by the system.
 *
 * * HOW IT WORKS:
 * The backend 'Mail Service' reads these templates. It replaces {{handlebars}}
 * variables with actual data based on the 'placeholders' array defined here.
 *
 * * CONFIGURATION SCHEMA:
 * - subject: The email subject line.
 * - placeholders: List of dynamic data keys required (e.g., 'name', 'date').
 * - html: The full HTML body of the email.
 *
 * * NOTE: Standard Header and Footer are injected automatically by the mailer service
 * (defined in Constants.js), so these templates only need the <body> content.
 */

export const emailTemplates = {
	// -------------------------
	// 1. User Onboarding
	// -------------------------
	welcome: {
		subject: 'Welcome to the {{brand.organizationShortName}}!',
		placeholders: ['name'],
		html: `
            <h3>Welcome to the {{brand.organizationShortName}}!</h3>
            <p>Dear {{name}},</p>
            <p>We're excited to welcome you to the {{brand.organizationShortName}} community! By creating an account, you're now one step closer to accessing opportunities that support your educational journey.</p>
            <ul>
                <li><strong>Personalized Dashboard:</strong> Manage your applications, track their progress, and review key deadlines all in one place.</li>
                <li><strong>Application Submissions:</strong> Apply for financial assistance up to four times throughout your undergraduate studies.</li>
                <li><strong>Supplemental Portal:</strong> Easily upload letters of recommendation directly from your referees to your account.</li>
                <li><strong>Interview Portal:</strong> If selected for an interview, no need for additional tools—everything will take place right in your account!</li>
            </ul>
            <p>Feel free to log in at any time. If you have any questions, our team is here to assist you. You can reach us at <a href="mailto:{{brand.contactEmail}}">{{brand.contactEmail}}</a>.</p>
            <p>Once again, welcome—we look forward to receiving your applications and supporting your future success!</p>
        `,
	},

	// -------------------------
	// 2. Application Window Alerts
	// -------------------------
	windowOpen: {
		subject: 'The Application Window is Now Open!',
		placeholders: ['name'],
		html: `
            <h3>The Application Window is Now Open!</h3>
            <p>Dear {{name}},</p>
            <p>We're excited to announce that the application period for the {{brand.organizationShortName}} is now officially open! You can now submit your applications and take the next step in supporting your educational journey.</p>
            <ul>
                <li><strong>Personalized Dashboard:</strong> Manage your applications, track their progress, and review submission deadlines all in one place.</li>
                <li><strong>Submit Your Application:</strong> Make sure to complete all required sections and submit before the deadline to be considered.</li>
                <li><strong>Upload Supporting Documents:</strong> Don't forget to attach any necessary letters of recommendation or supplemental materials.</li>
            </ul>
            <p>We encourage you to apply as soon as you're ready. Our team looks forward to reviewing your submission and supporting your educational aspirations.</p>
        `,
	},
	windowClosing: {
		subject: 'The Application Window is Closing Soon!',
		placeholders: ['name'],
		html: `
            <h3>The Application Window is Closing Soon!</h3>
            <p>Dear {{name}},</p>
            <p>This is a friendly reminder that the application window for the {{brand.organizationShortName}} is closing soon! Time is running out to submit your application, so be sure to finalize everything before the deadline.</p>
            <ul>
                <li><strong>Log in to Your Dashboard:</strong> Complete or review your application and track your progress.</li>
                <li><strong>Submit Supporting Documents:</strong> Attach any letters of recommendation or other necessary materials before the window closes.</li>
                <li><strong>Don't Miss the Deadline:</strong> Ensure everything is submitted on time to be considered for this year's funding opportunities.</li>
            </ul>
            <p>We're eager to review your application, and we don't want you to miss this chance. Please complete your submission before the deadline!</p>
        `,
	},
	windowClosed: {
		subject: 'The Application Window Has Closed',
		placeholders: ['name'],
		html: `
            <h3>The Application Window Has Closed</h3>
            <p>Dear {{name}},</p>
            <p>The application window for the {{brand.organizationShortName}} has now officially closed. We want to thank everyone who submitted their applications, and we are excited to begin reviewing them.</p>
            <p>If you missed the deadline, email us at <a href="mailto:{{brand.contactEmail}}">{{brand.contactEmail}}</a> to see if we can make an exception for you.</p>
            <p>Thank you for being a part of this important process, and we appreciate your interest in the {{brand.organizationShortName}}.</p>
        `,
	},

	// -------------------------
	// 3. Application Lifecycle Updates
	// -------------------------
	appSubmitted: {
		subject: 'Your Application Has Been Submitted!',
		placeholders: ['name'],
		html: `
            <h3>Thank You for Submitting Your Application!</h3>
            <p>Dear {{name}},</p>
            <p>We are pleased to inform you that your application has been successfully submitted. Our team will carefully review all materials, and we'll keep you updated on the next steps as your application progresses.</p>
            <p>You can monitor your application's status in your personalized dashboard at any time.</p>
            <p>Thank you for taking this important step. We wish you the best of luck in the review process!</p>
        `,
	},
	appCompleted: {
		subject: 'Your Application Is Complete!',
		placeholders: ['name'],
		html: `
            <h3>Your Application Is Complete!</h3>
            <p>Dear {{name}},</p>
            <p>Congratulations! We have received all required materials, and your application is now complete. You can rest assured that it will be reviewed thoroughly, and you'll be notified of any updates.</p>
            <p>As always, feel free to log in to your dashboard to check your application's current status.</p>
            <p>Thank you for your diligence, and best of luck!</p>
        `,
	},
	appIncomplete: {
		subject: 'Your Application Is Incomplete',
		placeholders: ['name'],
		html: `
            <h3>Your Application Is Incomplete</h3>
            <p>Dear {{name}},</p>
            <p>We noticed that your application is missing some required materials. To continue processing your application, please log in to your account and upload the missing information as soon as possible.</p>
            <p>We're looking forward to completing the review process for your application. If you need any assistance, feel free to contact us at <a href="mailto:{{brand.contactEmail}}">{{brand.contactEmail}}</a>.</p>
            <p>Thank you for your attention on this matter!</p>
        `,
	},
	incompleteReminder: {
		subject: 'Reminder: Your Application Is Incomplete',
		placeholders: ['name'],
		html: `
            <h3>Reminder: Your Application Is Incomplete</h3>
            <p>Dear {{name}},</p>
            <p>This is just a friendly reminder that your application is still incomplete. To complete your submission, please log in to your account and provide the missing documents and information as soon as possible.</p>
            <p>Completing your application will allow us to proceed with the review and ensure timely consideration.</p>
            <p>If you have any questions or need help, don't hesitate to reach out to us at <a href="mailto:{{brand.contactEmail}}">{{brand.contactEmail}}</a>.</p>
        `,
	},

	// -------------------------
	// 4. Decision & Status
	// -------------------------
	appAdvancedToInterview: {
		subject: 'Application Advanced for Interviews',
		placeholders: ['name'],
		html: `
            <h3>Your Application Has Advanced to the Interview Stage!</h3>
            <p>Dear {{name}},</p>
            <p>We're excited to inform you that your application has successfully advanced to the next stage: the interview process. This is a significant step in your journey toward potential funding, and we'll be in touch soon with the interview details.</p>
            <p>If you have any immediate questions, feel free to contact us at <a href="mailto:{{brand.contactEmail}}">{{brand.contactEmail}}</a>.</p>
            <p>Best of luck in the interview process, and congratulations on making it this far!</p>
        `,
	},
	appApproved: {
		subject: 'Your Application Status',
		placeholders: ['name', 'award.type', 'award.amount', 'award.followUp'],
		html: `
            <h3>Your Application Status</h3>
            <p>Dear {{name}},</p>
            <p>We are thrilled to inform you that your application has been selected for the following award:</p>
            <p><strong>{{award.type}}:</strong> {{award.amount}}</p>
            <p><strong>What's Next?</strong></p>
            <p>{{award.followUp}}</p>
            <p>We recognize the hard work and dedication you've put into this process, and we're excited to support your educational journey.</p>
            <p>Please log in to your account to review the details of your funding award.</p>
            <p>If you have any questions, don't hesitate to reach out to us at <a href="mailto:{{brand.contactEmail}}">{{brand.contactEmail}}</a>.</p>
            <p>Once again, congratulations—we're proud to be part of your story!</p>
        `,
	},
	appDenied: {
		subject: 'Your Application Status',
		placeholders: ['name', 'reason'],
		html: `
            <h3>Your Application Status</h3>
            <p>Dear {{name}},</p>
            <p>After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.</p>
            <p>Reason: {{reason}}</p>
            <p>We appreciate your interest in the {{brand.organizationShortName}}, and we encourage you to apply again in future funding cycles if eligible.</p>
            <p>If you have any questions or would like feedback on your application, feel free to contact us at <a href="mailto:{{brand.contactEmail}}">{{brand.contactEmail}}</a>.</p>
        `,
	},

	// -------------------------
	// 5. Interviews
	// -------------------------
	interviewInvitation: {
		subject: 'Interview Invite - {{brand.organizationShortName}}',
		placeholders: ['name', 'interviewDate', 'interviewTime', 'interviewId'],
		html: `
            <h3>Your Application Was Selected!</h3>
            <p>Dear {{name}},</p>
            <p>The committee was very impressed with your application, and after careful consideration, we are delighted to invite you to the final step in our selection process: a virtual interview.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <h4 style="color: #006B3F;">Interview Details</h4>
            <p>Your interview is scheduled for:</p>
            <p><strong>Date:</strong> {{interviewDate}}</p>
            <p><strong>Time:</strong> {{interviewTime}}</p>
            <p><strong>Action Required:</strong> Please reply to this email as soon as possible to confirm your attendance. If you have an unavoidable conflict, please let us know immediately so we can try to explore alternative options. An interview is required to be awarded any funding so please try to make your scheduled interview work. Communication is key.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <h4 style="color: #006B3F;">How to Prepare for Success</h4>
            <p>The goal of this interview is for us to get to know you beyond your application. To help you prepare, we suggest you be ready to discuss:</p>
            <ul>
                <li>Your goals and aspirations.</li>
                <li>Your experiences and positions.</li>
                <li>Your understanding of the background and values our fund seeks to promote.</li>
            </ul>
            <p>We recommend finding a quiet, well-lit space for the call and testing your camera and microphone beforehand.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <h4 style="color: #006B3F;">What to Expect</h4>
            <ul>
                <li>The interview will be a <strong>15-minute conversation</strong> with members of our review committee.</li>
                <li>It will take place on our secure video portal; no downloads or other software will be necessary.</li>
                <li>Please click the button below to enter your private virtual waiting room <strong>5 minutes before</strong> your scheduled time. We will admit you to the interview once we are ready.</li>
            </ul>
            <p style="text-align: center; margin: 25px 0;">
                <a href="{{brand.url}}/interviews/waiting-room/{{interviewId}}" style="background-color: #006B3F; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Join Interview Waiting Room</a>
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p>We sincerely look forward to speaking with you and learning more about your story.</p>
        `,
	},

	// -------------------------
	// 6. Admin Alerts
	// -------------------------
	memberActivitySummary: {
		subject: '{{brand.internalName}} Activity Summary',
		placeholders: ['newCount', 'submittedCount', 'completedCount', 'incompleteCount', 'eligibleCount', 'invitedCount', 'awardedCount', 'deniedCount', 'deletedCount', 'totalActive'],
		html: `
            <h3>Application Activity Summary</h3>
            <p>Here is the summary of application activity:</p>
            <ul>
                <li><strong>New Applications Started:</strong> {{newCount}}</li>
                <li><strong>Applications Updated:</strong> {{updatedCount}}</li>
                <li><strong>Applications Submitted:</strong> {{submittedCount}}</li>
                <li><strong>Applications Marked Completed:</strong> {{completedCount}}</li>
                <li><strong>Applications Marked Eligible:</strong> {{eligibleCount}}</li>
                <li><strong>Applicants Invited for Interview:</strong> {{invitedCount}}</li>
                <li><strong>Awards Granted:</strong> {{awardedCount}}</li>
                <li><strong>Applications Denied/Deferred:</strong> {{deniedCount}}</li>
                <li><strong>Applications Marked Incomplete:</strong> {{incompleteCount}}</li>
                <li><strong>Applications Deleted:</strong> {{deletedCount}}</li>
            </ul>
            <p><strong>Total Active Applications in Window:</strong> {{totalActive}}</p>
            <p>You can view details by logging into the admin dashboard.</p>
        `,
	},
	incompleteCountAlert: {
		subject: 'ALERT: High Number of Incomplete Applications',
		placeholders: ['incompleteCount', 'threshold'],
		html: `
            <h3>Incomplete Application Alert</h3>
            <p>The number of applications currently marked as 'Incomplete' ({{incompleteCount}}) has exceeded the threshold of {{threshold}}.</p>
            <p>Please review these applications in the admin dashboard and consider sending reminders.</p>
        `,
	},
};