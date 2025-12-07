import { createTransport } from "nodemailer";
import { resolve } from "path";
import { readFileSync } from "fs";
import mjml2html from "mjml";
import { logData } from "@svkruik/sk-platform-formatters";
import { UplinkMessage } from "@svkruik/sk-uplink-connector";

/**
 * Sends an email using an MJML template.
 * 
 * @param to The recipient email address.
 * @param subject What the email subject should be.
 * @param replacements An array of key-value pairs for template replacements.
 * @param fileName The name of the MJML template file (without extension).
 * @returns A promise that resolves to a boolean indicating success.
 */
export async function sendMail(
    to: string,
    subject: string,
    replacements: Array<{
        key: string;
        value: string;
    }>,
    fileName: string,
): Promise<boolean> {
    try {
        // Email login
        const username: string = process.env.MAIL_USERNAME as string;
        const transport = createTransport({
            host: process.env.MAIL_HOST,
            port: 465,
            secure: true,
            auth: {
                user: username,
                pass: process.env.MAIL_PASSWORD,
            },
        });

        // Preparing the template
        const templatePath = resolve(process.cwd(), "./src/mail/layouts", `${fileName}.mjml`);
        let templateFile = readFileSync(templatePath, "utf-8");
        replacements.forEach((replacement) => {
            templateFile = templateFile.replace(
                `{{ ${replacement.key} }}`,
                replacement.value,
            );
        });
        if (templateFile.includes("{{")) {
            throw new Error("Missing some replacements in the template.", {
                cause: { statusCode: 1400 },
            });
        }

        // Parsing MJML to HTML
        const html = mjml2html(templateFile, {
            fonts: {
                "Open Sans":
                    "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300..800",
            },
        });
        if (html.errors.length > 0) {
            logData(`MJML parsing errors: ${JSON.stringify(html.errors)}`, "error");
            throw new Error("Something went wrong while parsing the email.", {
                cause: { statusCode: 1500 },
            });
        }

        const response: boolean = await new Promise((resolve, reject) => {
            transport.sendMail(
                {
                    from: `"SK Platform" <${username}>`,
                    to: to,
                    subject: subject,
                    html: html.html,
                    replyTo: "me@stefankruik.nl",
                }, (error, _info) => {
                    if (error) {
                        logData(`Error sending mail: ${error.message}`, "error");
                        reject(false);
                    } else resolve(true);
                });
        });
        if (!response) throw new Error("Something went wrong while sending the email.", {
            cause: { statusCode: 1500 },
        });
        return response;
    } catch (error: any) {
        throw error;
    }
}

export async function uplinkHandler(messageContent: UplinkMessage): Promise<void> {
    switch (messageContent.task) {
        case "sendMail": {
            const payload = JSON.parse(messageContent.content as string);
            if (!payload.to || !payload.subject || !payload.fileName) {
                logData("Uplink sendMail task missing required fields.", "error");
                return;
            }
            await sendMail(
                payload.to,
                payload.subject,
                payload.replacements || [],
                payload.fileName);
            return logData("Handled sendMail task in custom handler.", "info");
        }
        default:
            break;
    }
}