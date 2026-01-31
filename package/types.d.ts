// Functions
export function sendMail<T extends validFileNames>(
    mailDetails: MailDetails<T>,
    protocol: validProtocols,
    appName: string
): Promise<void>;

// Types
export type validProtocols = "amqp" | "http";
export type validFileNames = "2fa-code" | "new-guest-login" | "new-login" | "magic-link-login";
export type ReplacementMap = {
    "2fa-code": Array<
        { key: "firstName"; value: string, },
        { key: "platformName"; value: string },
        { key: "verificationPin"; value: string | number }>,
    "new-guest-login": Array<
        { key: "adminName"; value: string },
        { key: "guestName"; value: string },
        { key: "platformName"; value: string }>,
    "new-login": Array<
        { key: "firstName"; value: string, },
        { key: "platformName"; value: string }>,
    "magic-link-login": Array<
        { key: "firstName"; value: string, },
        { key: "platformName"; value: string },
        { key: "loginLink"; value: string }>,
};

export type MailDetails<T extends validFileNames> = {
    to: string; // Email will be validated
    replacements: ReplacementMap[T];
    fileName: T;
};