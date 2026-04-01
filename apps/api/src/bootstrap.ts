import { analytics } from "@autonoma/analytics";
import { createSentryConfig } from "@autonoma/logger";
import * as Sentry from "@sentry/node";
import { env } from "./env";

let bootstrapped = false;

function validateRuntimeConfig() {
    if (
        env.STRIPE_ENABLED &&
        env.STRIPE_WEBHOOK_DISPATCH_MODE === "workflow" &&
        env.STRIPE_INTERNAL_WEBHOOK_SECRET == null
    ) {
        throw new Error("STRIPE_INTERNAL_WEBHOOK_SECRET is required when STRIPE_WEBHOOK_DISPATCH_MODE=workflow");
    }

    if (env.STRIPE_ENABLED && env.STRIPE_WEBHOOK_DISPATCH_MODE === "workflow") {
        if (process.env.WORKFLOW_TARGET_WORLD !== "@workflow/world-postgres") {
            throw new Error(
                "WORKFLOW_TARGET_WORLD must be '@workflow/world-postgres' when Stripe webhook workflow dispatch is enabled",
            );
        }

        if (process.env.WORKFLOW_POSTGRES_URL == null && process.env.DATABASE_URL == null) {
            throw new Error(
                "WORKFLOW_POSTGRES_URL (or DATABASE_URL) is required when WORKFLOW_TARGET_WORLD='@workflow/world-postgres'",
            );
        }
    }
}

export function bootstrapApiRuntime() {
    if (bootstrapped) return;

    validateRuntimeConfig();

    Sentry.init(createSentryConfig({ contextType: "service", contextName: "api" }));

    if (env.POSTHOG_KEY != null) {
        analytics.init(env.POSTHOG_KEY, env.POSTHOG_HOST);
    }

    bootstrapped = true;
}
