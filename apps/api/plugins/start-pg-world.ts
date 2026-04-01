export default defineNitroPlugin(async () => {
    const { getWorld } = await import("workflow/runtime");
    await getWorld().start?.();
});
