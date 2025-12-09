import Fastify, { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import dotenv from "dotenv";
import { logData, logError } from '@svkruik/sk-platform-formatters';
import { mountUplink } from '@svkruik/sk-uplink-connector';
import { sendMail, uplinkHandler } from './utils/mail';
import { formatApiError } from './utils/format';
dotenv.config();
const fastify = Fastify();
if (!process.env.REST_PORT || !process.env.REST_AUTHENTICATION_TOKEN) {
    logError("Missing configuration in environment variables.");
    process.exit(1);
}

// Authorization & Logging
fastify.addHook("preHandler", (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
    const authorization = request.headers.authorization;
    if (!authorization || authorization.split(" ")[1] !== process.env.REST_AUTHENTICATION_TOKEN) return reply.code(401).send();
    logData(`API Request || Agent: ${request.headers["user-agent"]} || ${request.method} ${request.url} || Body: ${request.body ? `(100 char limit) ${JSON.stringify(request.body).slice(0, 100)}` : "None"}`, "info");
    return done();
});

// Sending a mail
fastify.post("/send", {
    schema: {
        body: {
            type: "object",
            required: ["to", "subject", "fileName"],
            properties: {
                to: { type: "string" },
                subject: { type: "string" },
                replacements: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            key: { type: "string" },
                            value: { type: "string" },
                        },
                    },
                },
                fileName: { type: "string" },
            },
        },
    }
}, async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
        const { to, subject, replacements, fileName } = request.body as {
            to: string;
            subject: string;
            replacements?: Array<{
                key: string;
                value: string;
            }>;
            fileName: string;
        };
        await sendMail(to, subject, replacements || [], fileName);
    } catch (error: any) {
        return formatApiError(error, reply);
    }
});

// Default Endpoints
fastify.get("*", async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send({ message: "SK Dispatch API" });
});
fastify.post("*", async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send({ message: "SK Dispatch API" });
});

// Start
fastify.listen({ port: parseInt(process.env.REST_PORT) })
    .then(async () => {
        await mountUplink({
            "handler": uplinkHandler,
            "supportedTasks": ["sendMail"],
        });
        logData(`Dispatch API server listening on port ${process.env.REST_PORT}`, "info");
    }).catch((error) => logError(error));