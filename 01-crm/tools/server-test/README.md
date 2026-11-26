# Complete server search experiment

Manual only, no production feed or customer-database writes. Run on a temporary branch containing an AES-256-GCM encrypted scope file. The one-time repository secret supplies the key; remove it after retrieving and decrypting results. Do not commit plaintext scopes, keys, backups or decrypted results.

`scope.cjs` derives anonymous members and tasks from the same saved-demand, inventory and task-generation functions used by CRM/helper. Only selected demand fields and public listing snapshot fields are retained. Capture the scope hash and backup timestamp to avoid changing the workload between runs.

`full.cjs` walks every generated scope to a verified final/zero-result page, rejects repeated URLs/row sets and mismatched listing IDs, deduplicates detail checks, and applies the existing matching engine. Direct HTTP is attempted first; an isolated server browser handles unresolved page rendering and district selection. It does not use a user browser profile, sign in, or solve challenges. Requests honor 591 cooldown and are paced by source. Detail failures remain unknown, never automatically unavailable. Images of retained candidates are checked separately. A deadline produces an incomplete result.

The public artifact contains aggregate counts and anonymous member labels. Listing results are encrypted. Historical buyer snapshots support only a limited comparison: they are not a complete same-time helper feed and do not supply an inventory baseline. Never claim full result equality from those snapshots. Smoke mode tests one scope per source and always reports `complete:false`.

Checks: `node 01-crm/tests/server-full.test.cjs`. Live execution requires installed buyer-feed dependencies, Playwright/Chromium, and `SCOPE_FILE`; set `CRM_FULL_TEST_KEY` for an encrypted input. `PLAYWRIGHT_MODULE`, `CHROME_PATH`, `TEST_OUTPUT`, and `SMOKE=1` are optional. The full workflow has no schedule and reads no CRM customer files.
