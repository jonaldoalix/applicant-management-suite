const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_KEY_PATH = path.join(__dirname, '../../serviceAccountKey.json');

let db;
try {
    const serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    db = admin.firestore();
    console.log('Firebase Admin initialized.');
} catch (e) {
    console.error('Initialization Error:', e.message);
    process.exit(1);
}

const TARGET_COLLECTION = 'mail_cache';
const generateId = () => Math.random().toString(36).substring(2, 15);

const now = Date.now();
const oneHour = 60 * 60 * 1000;
const oneDay = 24 * oneHour;

const fakeEmails = [
    {
        to: "inquiries@demo-ams.org",
        sender: "\"James Smith\" <jsmith_2026@gmail.com>",
        subject: "Question about the deadline",
        description: "Hi Team, I noticed the website says the deadline is Friday, but I was wondering...",
        timestamp: now - (2 * oneHour),
        tags: ["inquiries"],
        isRead: false,
        content: `<div><p>Hi Team,</p><p>I noticed the website says the deadline is Friday, but I was wondering if that means Friday at midnight or Friday at 5 PM EST? I'm waiting on my guidance counselor to upload my transcript and I want to make sure I don't miss the cutoff.</p><p>Thanks so much,<br>James</p></div>`
    },
    {
        to: "hello@demo-ams.org",
        sender: "\"Nigerian Prince\" <prince_wealth_01@yahoo.com>",
        subject: "URGENT: YOUR UNCLAIMED FUNDS",
        description: "DEAR SIR/MADAM, I am Prince Chukwuebuka from Nigeria...",
        timestamp: now - (5 * oneHour),
        tags: ["hello"],
        isRead: false,
        content: `<div><p><strong>DEAR SIR/MADAM,</strong></p><p>I am Prince Chukwuebuka from Nigeria. I have a sum of $45,000,000 USD that I need to transfer to a secure account in the United States. Since your organization handles funds, I thought of you. Please provide your bank details immediately.</p><p>Warm Regards,<br>The Prince</p></div>`
    },
    {
        to: "committee@demo-ams.org",
        sender: "\"Internal IT Desk\" <it_admin@demo-ams.org>",
        subject: "[ACTION REQUIRED] Update your password",
        description: "Please update your password by the end of the day or you will be locked out of the portal.",
        timestamp: now - (1 * oneDay),
        tags: ["committee"],
        isRead: true,
        content: `<div><p>Team,</p><p>This is a friendly reminder that your organization password will expire in 12 hours. Please visit the IT portal to reset your password before the end of the day or you will be locked out of the applicant dashboard.</p><p>Best,<br>IT Desk</p></div>`
    },
    {
        to: "admin@demo-ams.org",
        sender: "\"Sarah Jenkins\" <s.jenkins.music@gmail.com>",
        subject: "Re: Your Application Status",
        description: "Thank you for the update! I am so excited to be considered for an interview.",
        timestamp: now - (1.5 * oneDay),
        tags: ["admin"],
        isRead: true,
        content: `<div><p>Thank you for the update!</p><p>I am so excited to be considered for an interview. I have gone ahead and booked the 3:00 PM slot for next Tuesday. Is there anything specific I should prepare or bring with me to the interview?</p><p>Best regards,<br>Sarah Jenkins</p><br><blockquote><em>On Monday, Admin wrote: You have been selected for an interview...</em></blockquote></div>`
    },
    {
        to: "webmaster@demo-ams.org",
        sender: "\"Dad\" <grumpy_dad_64@aol.com>",
        subject: "HOW DO I OPEN THE PDF FILE",
        description: "I am trying to upload my son's tax returns but the computer says the file is too big.",
        timestamp: now - (3 * oneDay),
        tags: ["webmaster"],
        isRead: false,
        content: `<div><p>HELLO,</p><p>I AM TRYING TO UPLOAD MY SON'S TAX RETURNS BUT THE COMPUTER SAYS THE FILE IS TOO BIG. HOW DO I MAKE IT SMALLER? I TRIED FOLDING THE PAPER BEFORE SCANNING IT BUT THAT DID NOT HELP. PLEASE CALL ME AT 555-0198.</p><p>-RICHARD</p></div>`
    },
    {
        to: "hello@demo-ams.org",
        sender: "\"Marketing Agency\" <spammy_marketer@outreach.io>",
        subject: "10x your applicant volume!",
        description: "Hey! Let's schedule a quick 5-min call to discuss how our AI-driven synergy matrix can...",
        timestamp: now - (4 * oneDay),
        tags: ["hello"],
        isRead: true,
        content: `<div><p>Hey there!</p><p>Let's schedule a quick 5-min call to discuss how our AI-driven synergy matrix can 10x your applicant volume. We've helped thousands of non-profits scale their scholarship pipelines using blockchain technology.</p><p>Do you have 15 minutes next Wednesday?</p><p>Cheers,<br>Chad</p></div>`
    },
    {
        to: "committee@demo-ams.org",
        sender: "\"Board Director\" <director@demo-ams.org>",
        subject: "Donuts in the breakroom",
        description: "Just a heads up, someone brought donuts. First come first serve.",
        timestamp: now - (5 * oneDay),
        tags: ["committee"],
        isRead: false,
        content: `<div><p>Just a heads up, someone brought donuts. They are in the breakroom. First come first serve. Stay away from the Boston cream, those are mine.</p></div>`
    },
    {
        to: "inquiries@demo-ams.org",
        sender: "\"Alex Patel\" <apatel_student@outlook.com>",
        subject: "Recommendation letter issue",
        description: "My teacher said they didn't receive the email link for the recommendation.",
        timestamp: now - (6 * oneDay),
        tags: ["inquiries"],
        isRead: false,
        content: `<div><p>Hello,</p><p>My teacher, Mr. Davis, said he still hasn't received the email link to upload his letter of recommendation. I double-checked and I entered his email address correctly (davis.m@highschool.edu). Is there any way you can resend the link to him?</p><p>Thank you,<br>Alex Patel</p></div>`
    },
    {
        to: "inquiries@demo-ams.org",
        sender: "\"Michael Scott\" <mscott_dundermifflin@gmail.com>",
        subject: "Grant idea for local paper company",
        description: "I have a fantastic idea for a grant that would benefit the local paper supply ecosystem.",
        timestamp: now - (6.5 * oneDay),
        tags: ["inquiries"],
        isRead: true,
        content: `<div><p>Hello!</p><p>I run a small paper branch and I believe we fall under your 'local community building' grant category. Do you fund organizations that support regional paper distribution networks? It's essential work.</p><p>Best,<br>Michael</p></div>`
    },
    {
        to: "admin@demo-ams.org",
        sender: "\"Amanda Lee\" <amandalee_24@yahoo.com>",
        subject: "Typo in my submitting",
        description: "I accidentally wrote that I was born in 2024 instead of 2004.",
        timestamp: now - (7 * oneDay),
        tags: ["admin"],
        isRead: false,
        content: `<div><p>Hi,</p><p>I realize this is embarrassing, but I typed 2024 as my birth year. Can you please change this in my file to 2004? I am not a time traveler nor a baby.</p><p>Thanks,<br>Amanda</p></div>`
    },
    {
        to: "webmaster@demo-ams.org",
        sender: "\"Anonymous\" <skater_boi_88@hotmail.com>",
        subject: "Website bug",
        description: "The button on the front page is squished on my iPhone 4.",
        timestamp: now - (8 * oneDay),
        tags: ["webmaster"],
        isRead: false,
        content: `<div><p>Hey,</p><p>The submit button on the front page looks really squished when I use my iPhone 4. Can you guys fix this? It makes it really hard to click.</p></div>`
    },
    {
        to: "hello@demo-ams.org",
        sender: "\"Lumber Co\" <sales@discount-lumber-yard.com>",
        subject: "DISCOUNT WOOD FOR YOUR CAMP",
        description: "We saw you fund base camps. We have 4x4s on sale this week!",
        timestamp: now - (8.5 * oneDay),
        tags: ["hello"],
        isRead: true,
        content: `<div><p>Does your camp need wood? We got wood. 4x4s, 2x4s, plywood. 20% off if you bring a truck. Email back for details.</p></div>`
    },
    {
        to: "committee@demo-ams.org",
        sender: "\"Jane Doe\" <jdoe_board@demo-ams.org>",
        subject: "Can we move next week's meeting?",
        description: "I have a conflict with the current meeting time and was wondering if we could shift it...",
        timestamp: now - (9 * oneDay),
        tags: ["committee"],
        isRead: false,
        content: `<div><p>Hi everyone,</p><p>I have a conflict next Tuesday. Can we potentially shift the meeting to Wednesday at the same time? Let me know.</p><p>Jane</p></div>`
    },
    {
        to: "inquiries@demo-ams.org",
        sender: "\"Local Scout Troop\" <troop_104@gmail.com>",
        subject: "Thank you!",
        description: "We wanted to say a huge thank you for the grant last year.",
        timestamp: now - (10 * oneDay),
        tags: ["inquiries"],
        isRead: true,
        content: `<div><p>Dear Committee,</p><p>We just wanted to reach out and say a huge thank you. The funding we received last year allowed us to upgrade all our cooking gear. The scouts are thrilled!</p><p>Gratefully,<br>Troop 104</p></div>`
    },
    {
        to: "admin@demo-ams.org",
        sender: "\"Student Admin Services\" <noreply@studentaid.gov>",
        subject: "FASFA processing delays",
        description: "Please note that FAFSA 2025 forms are experiencing a 3 week delay in processing.",
        timestamp: now - (10.5 * oneDay),
        tags: ["admin"],
        isRead: false,
        content: `<div><p><strong>NOTICE:</strong> Due to unprecedented volume, the processing of FAFSA forms for the 2025-2026 academic year has been delayed by 3 weeks. Please plan your scholarship dispersments accordingly.</p></div>`
    },
    {
        to: "webmaster@demo-ams.org",
        sender: "\"Bot\" <auto-renew@ssl-provider.net>",
        subject: "Your SSL Certificate is expiring in 30 days",
        description: "Action required: Renew your SSL certificate for demo-ams.org.",
        timestamp: now - (11 * oneDay),
        tags: ["webmaster"],
        isRead: true,
        content: `<div><p>Your SSL certificate for demo-ams.org will expire on April 1st. Please log in to your account and renew it to prevent service disruption.</p></div>`
    },
    {
        to: "hello@demo-ams.org",
        sender: "\"Liam Johnson\" <liam.m.johnson@gmail.com>",
        subject: "Volunteering opportunities?",
        description: "Do you guys accept volunteers to help review applications?",
        timestamp: now - (12 * oneDay),
        tags: ["hello"],
        isRead: false,
        content: `<div><p>Hi!</p><p>I am a recent college grad who previously received a scholarship from your organization. I was wondering if you accept volunteers to help review the incoming applications this year? I'd love to give back.</p><p>Best,<br>Liam</p></div>`
    },
    {
        to: "committee@demo-ams.org",
        sender: "\"Finance Team\" <finance@demo-ams.org>",
        subject: "Q3 Budget Review",
        description: "Attached is the Q3 budget review. Please look it over before Friday.",
        timestamp: now - (13 * oneDay),
        tags: ["committee"],
        isRead: true,
        content: `<div><p>Team,</p><p>Please review the attached Q3 budget spreadsheets ahead of our Friday meeting. Note the variance in the operational expenses column.</p><p>Regards,<br>Finance</p></div>`
    },
    {
        to: "inquiries@demo-ams.org",
        sender: "\"Jessica Thompson\" <j.thompson.99@icloud.com>",
        subject: "Question about essay prompt",
        description: "For the second essay prompt, does the word limit include the title?",
        timestamp: now - (13.5 * oneDay),
        tags: ["inquiries"],
        isRead: false,
        content: `<div><p>Hi,</p><p>For the 'Overcoming Adversity' essay, does the 500 word limit strictly include the title? I'm currently at 502 words with the title included.</p><p>Thanks,<br>Jessica</p></div>`
    },
    {
        to: "admin@demo-ams.org",
        sender: "\"David Garcia\" <d_garcia01@gmail.com>",
        subject: "Forgot to attach transcript",
        description: "Can you please append this transcript to my application?",
        timestamp: now - (14 * oneDay),
        tags: ["admin"],
        isRead: true,
        content: `<div><p>Hello,</p><p>I accidentally submitted my application without attaching my final transcript. I have attached it to this email. Can you please add it to my file?</p><p>Sincerely,<br>David Garcia</p></div>`
    },
    {
        to: "webmaster@demo-ams.org",
        sender: "\"Google Cloud\" <billing-noreply@google.com>",
        subject: "Action Required: Project Billing",
        description: "Your billing account for project ams-fullstackboston is nearing its allocated quota limit.",
        timestamp: now - (15 * oneDay),
        tags: ["webmaster"],
        isRead: true,
        content: `<div><p>Your Google Cloud Platform billing account is nearing its monthly quota threshold limit. Please upgrade your account to avoid throttling of services.</p></div>`
    },
    {
        to: "hello@demo-ams.org",
        sender: "\"Kevin\" <kevin.from.accounting@hotmail.com>",
        subject: "Where is the coffee machine?",
        description: "Did someone move the Keurig? I can't find it on the second floor.",
        timestamp: now - (16 * oneDay),
        tags: ["hello"],
        isRead: false,
        content: `<div><p>Listen, I know this is the public inbox, but I couldn't find the internal one. Did someone move the Keurig? It's gone from the second floor breakroom. Who took it?</p><p>- Kevin</p></div>`
    },
    {
        to: "inquiries@demo-ams.org",
        sender: "\"High School Counselor\" <counseling_office@regionalhs.edu>",
        subject: "Portal access for multiple students",
        description: "Is there a way for me to upload transcripts for multiple students at once?",
        timestamp: now - (17 * oneDay),
        tags: ["inquiries"],
        isRead: true,
        content: `<div><p>Hello,</p><p>I have 12 students from my high school applying this year. Is there a counselor portal where I can upload all their transcripts in a batch, or do I need to use the unique link for each individual student?</p><p>Best,<br>Maria Rossi, Guidance</p></div>`
    },
    {
        to: "committee@demo-ams.org",
        sender: "\"President\" <president@demo-ams.org>",
        subject: "Welcome new members!",
        description: "Please join me in welcoming our two new board members...",
        timestamp: now - (18 * oneDay),
        tags: ["committee"],
        isRead: true,
        content: `<div><p>Hello everyone,</p><p>Please join me in welcoming our two newest board members, Sarah and Marcus! We are thrilled to have their expertise on the committee this year.</p><p>Best,<br>President</p></div>`
    },
    {
        to: "hello@demo-ams.org",
        sender: "\"Unknown\" <test12345@test.com>",
        subject: "test",
        description: "test test test",
        timestamp: now - (20 * oneDay),
        tags: ["hello"],
        isRead: true,
        content: `<div><p>test test test</p></div>`
    }
];

async function seedInbox() {
    console.log("Preparing to seed " + fakeEmails.length + " fake emails to " + TARGET_COLLECTION + "...");

    const batch = db.batch();
    let count = 0;

    for (const emailData of fakeEmails) {
        const messageId = "msg_" + generateId();
        const emailCacheDoc = {
            id: messageId,
            to: emailData.to,
            sender: emailData.sender,
            subject: emailData.subject,
            description: emailData.description,
            timestamp: emailData.timestamp,
            folderId: "0",
            folderName: "inbox",
            isRead: emailData.isRead,
            tags: emailData.tags,
            hasAttachment: false,
            hasInline: false,
            content: emailData.content,
            headerContent: null,
            attachments: [],
            inlineAttachments: []
        };

        const docRef = db.collection(TARGET_COLLECTION).doc(messageId);
        batch.set(docRef, emailCacheDoc);
        count++;
    }

    if (count > 0) {
        await batch.commit();
        console.log("Success: " + count + " fake emails seeded into the inbox.");
    } else {
        console.log('No emails to upload.');
    }
}

seedInbox();
