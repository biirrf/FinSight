import nodemailer from 'nodemailer';
import { WELCOME_EMAIL_TEMPLATE, NEWS_SUMMARY_EMAIL_TEMPLATE } from './templates';

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL!,
        pass: process.env.NODEMAILER_PASSWORD!,
    },
});

// Verify transporter configuration on startup to catch auth/config issues early
transporter.verify().then(() => {
    console.info('Nodemailer transporter verified successfully');
}).catch((err) => {
    console.error('Nodemailer transporter verification failed. Check NODEMAILER_EMAIL and NODEMAILER_PASSWORD, and ensure Gmail app passwords or OAuth is configured. Error:', err);
});

export const sendWelcomeEmail = async ({email, name, intro}:WelcomeEmailData) => {
    const htmlTemplate = WELCOME_EMAIL_TEMPLATE.replace('{{name}}', name).replace('{{intro}}', intro);

    const mailOptions = {
        from: `"FinSight" <finsight@noreply.com>`,
        to: email,
        subject: 'Welcome to FinSight!',
        text: 'Thanks for joining FinSight! Your dashboard is now ready. Start exploring market insights, automated summaries, and real time financial data, all in one place.',
        html: htmlTemplate,
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        console.info(`Welcome email sent to ${email}: ${info.messageId}`);
        return true;
    } catch (err) {
        console.error(`Failed to send welcome email to ${email}:`, err);
        // Re-throw to let callers decide how to handle failures, or return false if preferred
        throw err;
    }
}

export const sendNewsSummaryEmail = async (
    { email, date, newsContent }: { email: string; date: string; newsContent: string }
): Promise<void> => {
    const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
        .replace('{{date}}', date)
        .replace('{{newsContent}}', newsContent);

    const mailOptions = {
        from: `"FinSight News" <finsight@no-reply.com>`,
        to: email,
        subject: `📈 Market News Summary Today - ${date}`,
        text: `Today's market news summary from FinSight`,
        html: htmlTemplate,
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.info(`News summary email sent to ${email}: ${info.messageId}`);
    } catch (err) {
        console.error(`Failed to send news summary email to ${email}:`, err);
        throw err;
    }
};