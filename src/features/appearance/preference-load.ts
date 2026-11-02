type LoadFlags = {
    hydrated: boolean;
    loading: boolean;
    saving: boolean;
    loadError: boolean;
};

export const INITIAL_LOAD_FLAGS: LoadFlags = {
    hydrated: false,
    loading: false,
    saving: false,
    loadError: false,
};

// `apply` runs in the same tick as the final flags, so React renders both in one pass.
export async function loadOnce<Loaded>(
    get: () => LoadFlags,
    set: (flags: Partial<LoadFlags>) => void,
    read: () => Promise<Loaded>,
    apply: (loaded: Loaded) => void,
) {
    if (get().loading || (get().hydrated && !get().loadError)) return;
    set({ loading: true, loadError: false });
    try {
        apply(await read());
    } catch {
        set({ loadError: true });
    } finally {
        set({ loading: false, hydrated: true });
    }
}
