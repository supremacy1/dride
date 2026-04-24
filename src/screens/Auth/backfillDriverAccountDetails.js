try {
  require('dotenv').config();
} catch (error) {
  console.warn('dotenv not found, continuing without loading .env file');
}

const db = require('./db');
const { bulkBackfillDriverAccountDetails } = require('./driverWalletService');

const run = async () => {
  try {
    const result = await bulkBackfillDriverAccountDetails(db);
    console.log(
      `[Backfill] Completed. Total rows: ${result.total}. Updated: ${result.updated}. Unchanged: ${result.skipped}.`
    );
    process.exit(0);
  } catch (error) {
    console.error('[Backfill] Failed to update driver account details:', error);
    process.exit(1);
  }
};

run();
