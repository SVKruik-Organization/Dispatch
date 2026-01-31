import { logError } from "@svkruik/sk-platform-formatters";
import { sendUplink } from "@svkruik/sk-uplink-connector";
import { basename } from "path";
import { MailDetails, validFileNames, validProtocols } from "./types";

const mailSubjectLookup: Record<validFileNames, string> = {
    "2fa-code": "Your 2FA Verification Code",
    "new-guest-login": "New Guest Login Notification",
    "new-login": "New Login Alert",
    "magic-link-login": "Your Link for Login"
};

/**
 * Sends an email using the Dispatch service.
 * 
 * @param mailDetails Options for the mail itself.
 * @param protocol Send the request via Uplink or a fetch to the API.
 *      If you use "http", ensure that DISPATCH_HTTP_API_URL is set in your environment variables.
 *      If you use "amqp", ensure that your Uplink Connector is properly configured.
 * @param appName The name of the application sending the mail.
 * @returns 
 */
export async function sendMail<T extends validFileNames>(mailDetails: MailDetails<T>, protocol: validProtocols, appName: string): Promise<void> {
    if (!process.env.DISPATCH_HTTP_API_URL && protocol === "http")
        return logError(new Error("DISPATCH_HTTP_API_URL is not defined in environment variables."));

    try {
        const callerFile: string = basename((new Error().stack?.split("\n")[2] || "").trim().split(" ").pop() || "unknown").replaceAll(")", "");

        // Validate Email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailDetails.to))
            throw new Error(`Invalid email address provided: ${mailDetails.to}`);

        const payload: string = JSON.stringify({
            ...mailDetails,
            subject: mailSubjectLookup[mailDetails.fileName]
        });

        if (protocol === "http") {
            await fetch(process.env.DISPATCH_HTTP_API_URL!, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: payload
            });
        } else return await sendUplink({
            "name": "unicast-services",
            "router": "Dispatch",
            "type": "direct"
        }, {
            "content": payload,
            "reason": `Sending '${mailDetails.fileName}' mail via Dispatch Connector.`,
            "recipient": "Dispatch",
            "sender": appName,
            "triggerSource": callerFile,
            "task": "sendMail",
            "timestamp": new Date()
        });
    } catch (error: any) {
        logError(error);
    }
}