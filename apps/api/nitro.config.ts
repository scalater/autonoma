import { defineConfig } from "nitro";

export default defineConfig({
    modules: ["workflow/nitro"],
    hooks: {
        ready: async () => {
            const { getWorld } = await import("workflow/runtime");
            await getWorld().start?.();
        },
    },
    routes: {
        "/**": "./src/nitro-entry.ts",
    },
});
