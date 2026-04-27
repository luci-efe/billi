import { m as mastra } from './mastra.mjs';
import '@mastra/core';
import '@mastra/libsql';
import '@mastra/core/agent';
import '@mastra/memory';
import '@ai-sdk/openai';
import '@mastra/core/tools';
import 'zod';
import 'drizzle-orm';
import 'drizzle-orm/sqlite-core';

async function runMigration() {
      const storage = mastra.getStorage();

      if (!storage) {
        console.log(JSON.stringify({
          success: false,
          alreadyMigrated: false,
          duplicatesRemoved: 0,
          message: 'Storage not configured. Please configure storage in your Mastra instance.',
        }));
        process.exit(1);
      }

      // Access the observability store directly from storage.stores
      const observabilityStore = storage.stores?.observability;

      if (!observabilityStore) {
        console.log(JSON.stringify({
          success: false,
          alreadyMigrated: false,
          duplicatesRemoved: 0,
          message: 'Observability storage not configured. Migration not required.',
        }));
        process.exit(0);
      }

      // Check if the store has a migrateSpans method
      if (typeof observabilityStore.migrateSpans !== 'function') {
        console.log(JSON.stringify({
          success: false,
          alreadyMigrated: false,
          duplicatesRemoved: 0,
          message: 'Migration not supported for this storage backend.',
        }));
        process.exit(1);
      }

      try {
        // Run the migration - migrateSpans handles everything internally
        const result = await observabilityStore.migrateSpans();

        console.log(JSON.stringify({
          success: result.success,
          alreadyMigrated: result.alreadyMigrated,
          duplicatesRemoved: result.duplicatesRemoved,
          message: result.message,
        }));

        process.exit(result.success ? 0 : 1);
      } catch (error) {
        console.log(JSON.stringify({
          success: false,
          alreadyMigrated: false,
          duplicatesRemoved: 0,
          message: error instanceof Error ? error.message : 'Unknown error during migration',
        }));
        process.exit(1);
      }
    }

    runMigration();
