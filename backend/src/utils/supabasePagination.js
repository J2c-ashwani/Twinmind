import { supabaseAdmin } from '../config/supabase.js';

/**
 * Streams through every page of a Supabase query using .range(from, to)
 * so tables exceeding PostgREST's 1,000-row cap never truncate and large tables
 * never accumulate in memory at once.
 */
export async function forEachPage(buildQuery, onPage, { pageSize = 1000, maxPages = 100 } = {}) {
    let from = 0;
    for (let page = 0; page < maxPages; page++) {
        const to = from + pageSize - 1;
        const { data, error } = await buildQuery().range(from, to);
        if (error) throw error;
        if (!data || data.length === 0) break;

        await onPage(data, page);

        if (data.length < pageSize) break;
        from += pageSize;
    }
}

/**
 * Iterates through every page of Supabase Auth users safely.
 */
export async function forEachAuthUserPage(onUsers, { perPage = 1000, maxPages = 50 } = {}) {
    for (let page = 1; page <= maxPages; page++) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        const users = data?.users || [];
        if (users.length === 0) break;

        await onUsers(users, page);

        if (users.length < perPage) break;
    }
}
