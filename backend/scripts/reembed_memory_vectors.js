/**
 * Idempotent CLI script to re-embed legacy memory_vectors rows onto the active
 * coordinated embedding target (gemini-embedding-001, 1536 dims), while enforcing
 * exact row limits and preserving prior OpenAI vectors during transition.
 *
 * Usage:
 *   node scripts/reembed_memory_vectors.js --dry-run --limit=10
 *   node scripts/reembed_memory_vectors.js --batch-size=50 --limit=500
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import '../src/config/env.js';
import { supabaseAdmin } from '../src/config/supabase.js';
import aiService from '../src/services/aiService.js';
import geminiService from '../src/services/geminiService.js';

export async function runBackfill({
    db = supabaseAdmin,
    embedder = (text) => geminiService.generateEmbedding(text, { taskType: 'RETRIEVAL_DOCUMENT' }),
    activeTarget = aiService.getActiveEmbeddingTarget(),
    targetProvider = 'gemini',
    targetModel = geminiService.embeddingModelName || 'gemini-embedding-001',
    targetDims = geminiService.embeddingDimensions || 1536,
    dryRun = false,
    force = false,
    maxRows = 1000,
    batchSize = 50,
    backupFile = null,
} = {}) {
    if (activeTarget.provider !== targetProvider || activeTarget.model !== targetModel) {
        const mismatchMsg =
            `Active query target is ${activeTarget.provider}/${activeTarget.model}, ` +
            `which does not match backfill target ${targetProvider}/${targetModel}. ` +
            'Align EMBEDDING_PROVIDER before re-embedding or pass --force.';
        if (!force) {
            throw new Error(mismatchMsg);
        }
    }

    const effectiveBatchSize = Math.max(1, Math.min(100, Number(batchSize) || 50));
    const effectiveLimit = Math.max(0, Number(maxRows) || 0);
    const resolvedBackupFile = dryRun
        ? null
        : (backupFile || path.join(os.tmpdir(), `memory_vectors_legacy_backup_${Date.now()}.jsonl`));

    let offset = 0;
    let scanned = 0;
    let candidates = 0;
    let updated = 0;
    let failed = 0;

    while (scanned < effectiveLimit) {
        const remaining = effectiveLimit - scanned;
        const take = Math.min(effectiveBatchSize, remaining);
        const pageEnd = offset + take - 1;

        const { data: rows, error } = await db
            .from('memory_vectors')
            .select('id, content, embedding, metadata')
            .order('created_at', { ascending: true })
            .range(offset, pageEnd);

        if (error) throw error;
        if (!rows || rows.length === 0) break;

        for (const row of rows) {
            if (scanned >= effectiveLimit) break;
            scanned++;

            const meta = row.metadata || {};
            const alreadyTarget =
                meta.embedding_provider === targetProvider &&
                meta.embedding_model === targetModel &&
                Number(meta.embedding_dimensions) === targetDims;

            if (alreadyTarget) continue;
            candidates++;

            if (dryRun) continue;

            try {
                // Preserve prior vector cleanly to NDJSON backup before overwriting
                if (row.embedding) {
                    fs.appendFileSync(
                        resolvedBackupFile,
                        JSON.stringify({
                            id: row.id,
                            content: row.content,
                            metadata: meta,
                            embedding: row.embedding,
                            backed_up_at: new Date().toISOString(),
                        }) + '\n',
                        'utf8'
                    );
                }

                const vector = await embedder(row.content);
                const nextMeta = {
                    ...meta,
                    previous_embedding_provider: meta.embedding_provider || 'openai_legacy',
                    previous_embedding_model: meta.embedding_model || 'text-embedding-3-small',
                    embedding_provider: targetProvider,
                    embedding_model: targetModel,
                    embedding_dimensions: vector.length,
                    vector_version: `${targetProvider}:${targetModel}:${vector.length}`,
                    legacy_backup_file: resolvedBackupFile,
                    reembedded_at: new Date().toISOString(),
                };

                let { error: updErr } = await db
                    .from('memory_vectors')
                    .update({
                        embedding: vector,
                        ...(row.embedding ? { legacy_embedding: row.embedding } : {}),
                        metadata: nextMeta,
                    })
                    .eq('id', row.id);

                if (updErr && (updErr.code === '42703' || updErr.code === 'PGRST204' || /legacy_embedding/i.test(updErr.message || ''))) {
                    ({ error: updErr } = await db
                        .from('memory_vectors')
                        .update({ embedding: vector, metadata: nextMeta })
                        .eq('id', row.id));
                }

                if (updErr) throw updErr;
                updated++;
            } catch (err) {
                failed++;
                console.error(`Failed row ${row.id}:`, err.message);
            }
        }

        if (rows.length < take || scanned >= effectiveLimit) break;
        offset += rows.length;
    }

    return {
        dryRun,
        targetProvider,
        targetModel,
        targetDims,
        activeTarget,
        backupFile: resolvedBackupFile,
        scanned,
        candidates,
        updated,
        failed,
    };
}

const isEntrypoint = Boolean(
    process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
);

if (isEntrypoint) {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const force = args.includes('--force');
    const limitArg = args.find((a) => a.startsWith('--limit='));
    const batchArg = args.find((a) => a.startsWith('--batch-size='));
    const backupArg = args.find((a) => a.startsWith('--backup-file='));

    const maxRows = limitArg ? parseInt(limitArg.split('=')[1], 10) : 1000;
    const batchSize = batchArg ? parseInt(batchArg.split('=')[1], 10) : 50;
    const backupFile = backupArg ? backupArg.split('=')[1] : null;

    runBackfill({ dryRun, force, maxRows, batchSize, backupFile })
        .then((summary) => {
            console.log(JSON.stringify(summary, null, 2));
        })
        .catch((err) => {
            console.error('Re-embedding script failed:', err.message || err);
            process.exit(1);
        });
}
