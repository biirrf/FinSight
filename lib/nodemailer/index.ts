import nodemailer from 'nodemailer';
import { WELCOME_EMAIL_TEMPLATE } from './templates';

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL!,
        pass: process.env.NODEMAILER_PASSWORD!,
    },
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

    await transporter.sendMail(mailOptions);
}