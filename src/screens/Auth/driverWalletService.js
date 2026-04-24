const crypto = require('crypto');
const db = require('./db');

const PAYSTACK_API_BASE_URL = 'https://api.paystack.co';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PREFERRED_BANK = process.env.PAYSTACK_PREFERRED_BANK || 'wema-bank';
const PAYSTACK_COUNTRY = process.env.PAYSTACK_COUNTRY || 'NG';
const DRIVER_WALLET_TABLE = 'driver_wallets';
const DRIVER_WALLET_SELECT_FIELDS = 'id, driver_id, balance, total_earned, total_withdrawn, created_at, debt';

const stringifyForLog = (value) => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
};

const paystackRequest = async (path, options = {}) => {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  }

  const response = await fetch(`${PAYSTACK_API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json();

  if (!response.ok || payload.status !== true) {
    throw new Error(payload.message || `Paystack request failed with HTTP ${response.status}.`);
  }

  return payload;
};

const parseJsonValue = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const extractPaystackAccountDetails = (payload) => {
  const rootData = payload?.data || {};
  const dedicatedAccount = rootData.dedicated_account || rootData.account || rootData;
  const bankData = dedicatedAccount?.bank || rootData?.bank || {};
  const customerData = rootData?.customer || dedicatedAccount?.customer || {};

  return {
    provider: 'paystack',
    customer_code: customerData?.customer_code || rootData?.customer_code || null,
    dedicated_account_id: dedicatedAccount?.id ? String(dedicatedAccount.id) : null,
    account_name: dedicatedAccount?.account_name || rootData?.account_name || null,
    account_number: dedicatedAccount?.account_number || rootData?.account_number || null,
    bank_name: bankData?.name || dedicatedAccount?.bank_name || rootData?.bank_name || null,
    bank_slug: bankData?.slug || dedicatedAccount?.bank_slug || rootData?.bank_slug || null,
    currency: dedicatedAccount?.currency || rootData?.currency || 'NGN',
    status: dedicatedAccount?.assigned ? 'active' : rootData?.status || 'pending',
    assigned: Boolean(
      dedicatedAccount?.assigned ??
      rootData?.assigned ??
      rootData?.active
    ),
    metadata: payload || null,
  };
};

const hasMissingPersistedAccountDetails = (row) =>
  !row.account_number ||
  !row.account_name ||
  !row.bank_name ||
  !row.customer_code ||
  !row.dedicated_account_id;

const mergeAccountDetailsRow = (row, derivedDetails, metadataPayload) => ({
  ...row,
  provider: row.provider || derivedDetails.provider || 'paystack',
  customer_code: row.customer_code || derivedDetails.customer_code,
  dedicated_account_id: row.dedicated_account_id || derivedDetails.dedicated_account_id,
  account_name: row.account_name || derivedDetails.account_name,
  account_number: row.account_number || derivedDetails.account_number,
  bank_name: row.bank_name || derivedDetails.bank_name,
  bank_slug: row.bank_slug || derivedDetails.bank_slug,
  currency: row.currency || derivedDetails.currency,
  status:
    row.status && row.status !== 'pending'
      ? row.status
      : (derivedDetails.status || row.status || 'pending'),
  assigned:
    Number(row.assigned || 0) > 0
      ? Number(row.assigned)
      : Number(derivedDetails.assigned),
  metadata: metadataPayload,
});

const persistRecoveredAccountDetails = async (driverId, accountDetails, connection = db) => {
  await connection.query(
    `UPDATE driver_account_details
     SET
       provider = ?,
       customer_code = ?,
       dedicated_account_id = ?,
       account_name = ?,
       account_number = ?,
       bank_name = ?,
       bank_slug = ?,
       currency = ?,
       status = ?,
       assigned = ?,
       metadata = ?
     WHERE driver_id = ?`,
    [
      accountDetails.provider || 'paystack',
      accountDetails.customer_code || null,
      accountDetails.dedicated_account_id || null,
      accountDetails.account_name || null,
      accountDetails.account_number || null,
      accountDetails.bank_name || null,
      accountDetails.bank_slug || null,
      accountDetails.currency || 'NGN',
      accountDetails.status || 'pending',
      accountDetails.assigned ? 1 : 0,
      accountDetails.metadata ? JSON.stringify(accountDetails.metadata) : null,
      driverId,
    ]
  );
};

const getDriverRow = async (driverId, connection = db) => {
  const [rows] = await connection.query(
    `SELECT id, fullname, email, phone, ride_type
     FROM drivers
     WHERE id = ?
     LIMIT 1`,
    [driverId]
  );

  return rows[0] || null;
};

const fetchPaystackCustomerByEmailOrCode = async (emailOrCode) => {
  if (!emailOrCode) {
    return null;
  }

  try {
    const payload = await paystackRequest(`/customer/${encodeURIComponent(emailOrCode)}`);
    return payload.data || null;
  } catch (error) {
    console.error(`[Paystack] Fetch customer failed for ${emailOrCode}: ${error.message}`);
    return null;
  }
};

const listPaystackDedicatedAccounts = async (customerId) => {
  if (!customerId) {
    return [];
  }

  try {
    const payload = await paystackRequest(`/dedicated_account?customer=${encodeURIComponent(String(customerId))}`);
    return Array.isArray(payload.data) ? payload.data : [];
  } catch (error) {
    console.error(`[Paystack] List dedicated accounts failed for customer ${customerId}: ${error.message}`);
    return [];
  }
};

const listPaystackTransactions = async ({
  customerId,
  status = 'success',
  perPage = 50,
  page = 1,
} = {}) => {
  if (!customerId) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      customer: String(customerId),
      status,
      perPage: String(perPage),
      page: String(page),
    });
    const payload = await paystackRequest(`/transaction?${params.toString()}`);
    return Array.isArray(payload.data) ? payload.data : [];
  } catch (error) {
    console.error(`[Paystack] List transactions failed for customer ${customerId}: ${error.message}`);
    return [];
  }
};

const syncDriverAccountDetailsFromPaystack = async (driverId, connection = db) => {
  const driver = await getDriverRow(driverId, connection);
  if (!driver?.email) {
    return null;
  }

  const customer = await fetchPaystackCustomerByEmailOrCode(driver.email);
  if (!customer) {
    return null;
  }

  const customerCode = customer.customer_code || null;
  const customerId = customer.id || null;
  const dedicatedAccounts = await listPaystackDedicatedAccounts(customerId);
  const matchedAccount =
    dedicatedAccounts.find((account) => account?.customer?.email === driver.email) ||
    dedicatedAccounts[0] ||
    customer.dedicated_account ||
    null;

  if (!matchedAccount && !customerCode) {
    return null;
  }

  const accountDetails = extractPaystackAccountDetails({
    status: true,
    message: matchedAccount ? 'Dedicated account fetched from Paystack.' : 'Customer fetched from Paystack.',
    data: matchedAccount
      ? {
          ...matchedAccount,
          customer: matchedAccount.customer || customer,
        }
      : {
          customer,
        },
  });

  accountDetails.customer_code = accountDetails.customer_code || customerCode;
  accountDetails.status =
    matchedAccount && (matchedAccount.assigned || matchedAccount.active)
      ? 'active'
      : accountDetails.status || 'pending';
  accountDetails.assigned = Boolean(
    matchedAccount ? (matchedAccount.assigned ?? matchedAccount.active) : accountDetails.assigned
  );
  accountDetails.metadata = {
    source: 'paystack_sync',
    synced_at: new Date().toISOString(),
    customer,
    dedicated_account: matchedAccount,
  };

  await upsertDriverAccountDetails(driverId, accountDetails, connection);
  return accountDetails;
};

const bulkBackfillDriverAccountDetails = async (connection = db) => {
  await ensureDriverAccountDetailsTable(connection);

  const [rows] = await connection.query(
    `SELECT driver_id
     FROM driver_account_details
     ORDER BY driver_id ASC`
  );

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const [beforeRows] = await connection.query(
      `SELECT
        customer_code,
        dedicated_account_id,
        account_name,
        account_number,
        bank_name
       FROM driver_account_details
       WHERE driver_id = ?
       LIMIT 1`,
      [row.driver_id]
    );

    const before = beforeRows[0] || null;
    await getDriverAccountDetails(row.driver_id, connection);

    const [afterRows] = await connection.query(
      `SELECT
        customer_code,
        dedicated_account_id,
        account_name,
        account_number,
        bank_name
       FROM driver_account_details
       WHERE driver_id = ?
       LIMIT 1`,
      [row.driver_id]
    );

    const after = afterRows[0] || null;
    const changed = JSON.stringify(before) !== JSON.stringify(after);

    if (changed) {
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  return {
    total: rows.length,
    updated,
    skipped,
  };
};

const ensureDriverAccountDetailsTable = async (connection = db) => {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS driver_account_details (
      id INT AUTO_INCREMENT PRIMARY KEY,
      driver_id INT NOT NULL UNIQUE,
      provider VARCHAR(50) DEFAULT 'paystack',
      customer_code VARCHAR(100) NULL,
      dedicated_account_id VARCHAR(100) NULL,
      account_name VARCHAR(255) NULL,
      account_number VARCHAR(50) NULL,
      bank_name VARCHAR(120) NULL,
      bank_slug VARCHAR(120) NULL,
      currency VARCHAR(10) DEFAULT 'NGN',
      status VARCHAR(50) DEFAULT 'pending',
      assigned TINYINT(1) DEFAULT 0,
      metadata JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
};

const ensureWalletTables = async (connection = db) => {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${DRIVER_WALLET_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      driver_id INT NOT NULL UNIQUE,
      balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      total_earned DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      total_withdrawn DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      debt DECIMAL(10, 2) NOT NULL DEFAULT 0.00
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      driver_id INT NOT NULL,
      type VARCHAR(20) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      description VARCHAR(255) NULL,
      reference VARCHAR(191) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_wallet_transactions_driver_id (driver_id),
      INDEX idx_wallet_transactions_reference (reference)
    )
  `);
};

const ensureWalletBalance = async (driverId, connection = db) => {
  if (!driverId) {
    return null;
  }

  await ensureWalletTables(connection);
  await connection.query(
    `INSERT INTO ${DRIVER_WALLET_TABLE} (driver_id)
     VALUES (?)
     ON DUPLICATE KEY UPDATE driver_id = VALUES(driver_id)`,
    [driverId]
  );

  const [rows] = await connection.query(
    `SELECT ${DRIVER_WALLET_SELECT_FIELDS}
     FROM ${DRIVER_WALLET_TABLE}
     WHERE driver_id = ?
     LIMIT 1`,
    [driverId]
  );

  return rows[0] || null;
};

const getDriverAccountDetails = async (driverId, connection = db) => {
  if (!driverId) {
    return null;
  }

  await ensureDriverAccountDetailsTable(connection);
  const [rows] = await connection.query(
    `SELECT
      id,
      driver_id,
      provider,
      customer_code,
      dedicated_account_id,
      account_name,
      account_number,
      bank_name,
      bank_slug,
      currency,
      status,
      assigned,
      metadata,
      created_at,
      updated_at
     FROM driver_account_details
     WHERE driver_id = ?
     LIMIT 1`,
    [driverId]
  );

  const row = rows[0] || null;
  if (!row) {
    return null;
  }

  if (row.metadata && hasMissingPersistedAccountDetails(row)) {
    const metadataPayload = parseJsonValue(row.metadata);
    if (metadataPayload) {
      const derivedDetails = extractPaystackAccountDetails(metadataPayload);
      const mergedRow = mergeAccountDetailsRow(row, derivedDetails, metadataPayload);

      if (
        mergedRow.account_number ||
        mergedRow.account_name ||
        mergedRow.bank_name ||
        mergedRow.customer_code ||
        mergedRow.dedicated_account_id
      ) {
        await persistRecoveredAccountDetails(driverId, mergedRow, connection);
      }

      return mergedRow;
    }
  }

  if (hasMissingPersistedAccountDetails(row)) {
    const syncedDetails = await syncDriverAccountDetailsFromPaystack(driverId, connection);
    if (syncedDetails) {
      const [syncedRows] = await connection.query(
        `SELECT
          id,
          driver_id,
          provider,
          customer_code,
          dedicated_account_id,
          account_name,
          account_number,
          bank_name,
          bank_slug,
          currency,
          status,
          assigned,
          metadata,
          created_at,
          updated_at
         FROM driver_account_details
         WHERE driver_id = ?
         LIMIT 1`,
        [driverId]
      );

      return syncedRows[0] || row;
    }
  }

  return row;
};

const upsertDriverAccountDetails = async (driverId, accountDetails, connection = db) => {
  if (!driverId || !accountDetails) {
    return null;
  }

  await ensureDriverAccountDetailsTable(connection);

  const payload = [
    driverId,
    accountDetails.provider || 'paystack',
    accountDetails.customer_code || null,
    accountDetails.dedicated_account_id || null,
    accountDetails.account_name || null,
    accountDetails.account_number || null,
    accountDetails.bank_name || null,
    accountDetails.bank_slug || null,
    accountDetails.currency || 'NGN',
    accountDetails.status || 'pending',
    accountDetails.assigned ? 1 : 0,
    accountDetails.metadata ? JSON.stringify(accountDetails.metadata) : null,
  ];

  await connection.query(
    `INSERT INTO driver_account_details (
      driver_id,
      provider,
      customer_code,
      dedicated_account_id,
      account_name,
      account_number,
      bank_name,
      bank_slug,
      currency,
      status,
      assigned,
      metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      provider = VALUES(provider),
      customer_code = VALUES(customer_code),
      dedicated_account_id = VALUES(dedicated_account_id),
      account_name = VALUES(account_name),
      account_number = VALUES(account_number),
      bank_name = VALUES(bank_name),
      bank_slug = VALUES(bank_slug),
      currency = VALUES(currency),
      status = VALUES(status),
      assigned = VALUES(assigned),
      metadata = VALUES(metadata)`,
    payload
  );

  return getDriverAccountDetails(driverId, connection);
};

const splitFullName = (fullname = '', surname = '') => {
  const safeSurname = String(surname || '').trim();
  const parts = String(fullname).trim().split(/\s+/).filter(Boolean);

  if (safeSurname) {
    return {
      firstName: parts[0] || 'Driver',
      lastName: safeSurname,
    };
  }

  if (parts.length === 0) {
    return { firstName: 'Driver', lastName: 'Account' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Driver' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

const createOrFetchPaystackCustomer = async ({ email, firstName, lastName, phone, metadata }) => {
  const existingCustomer = await fetchPaystackCustomerByEmailOrCode(email);
  if (existingCustomer) {
    return existingCustomer;
  }

  const payload = await paystackRequest('/customer', {
    method: 'POST',
    body: {
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
      metadata,
    },
  });

  return payload.data || null;
};

const createDedicatedVirtualAccount = async ({ customerIdOrCode, firstName, lastName, phone }) => {
  const payload = await paystackRequest('/dedicated_account', {
    method: 'POST',
    body: {
      customer: customerIdOrCode,
      preferred_bank: PAYSTACK_PREFERRED_BANK,
      first_name: firstName,
      last_name: lastName,
      phone,
    },
  });

  return payload;
};

const assignDedicatedVirtualAccount = async ({ fullname, surname, email, phone, metadata }) => {
  if (!PAYSTACK_SECRET_KEY) {
    console.error('[Paystack] Dedicated account assignment failed: PAYSTACK_SECRET_KEY is not configured.');
    return {
      success: false,
      message: 'PAYSTACK_SECRET_KEY is not configured.',
      accountDetails: null,
    };
  }

  const { firstName, lastName } = splitFullName(fullname, surname);
  const requestPayload = {
    email,
    first_name: firstName,
    last_name: lastName,
    phone,
    preferred_bank: PAYSTACK_PREFERRED_BANK,
    metadata,
  };

  try {
    const customer = await createOrFetchPaystackCustomer({
      email,
      firstName,
      lastName,
      phone,
      metadata,
    });

    if (!customer?.id && !customer?.customer_code) {
      return {
        success: false,
        message: 'Customer could not be created on Paystack.',
        accountDetails: null,
      };
    }

    const payload = await createDedicatedVirtualAccount({
      customerIdOrCode: customer.id || customer.customer_code,
      firstName,
      lastName,
      phone,
    });

    const accountDetails = extractPaystackAccountDetails({
      ...payload,
      data: {
        ...(payload.data || {}),
        customer: payload.data?.customer || customer,
      },
    });

    return {
      success: true,
      message: payload.message || 'Virtual account assigned successfully.',
      accountDetails,
      raw: payload,
      statusCode: 200,
    };
  } catch (error) {
    console.error(
      `[Paystack] Dedicated account assignment request crashed. Error: ${error.message}. Request: ${stringifyForLog(
        requestPayload
      )}`
    );
    return {
      success: false,
      message: error.message || 'Paystack request failed unexpectedly.',
      accountDetails: null,
    };
  }
};

const getDriverFundingProfile = async (driverId, connection = db) => {
  await syncDriverWalletFundingFromPaystack(driverId, connection);
  const [wallet, accountDetails] = await Promise.all([
    ensureWalletBalance(driverId, connection),
    getDriverAccountDetails(driverId, connection),
  ]);

  return {
    wallet,
    accountDetails,
  };
};

const recordWalletFundingTransaction = async ({
  driverId,
  amount,
  reference,
  description,
  metadata,
}, connection) => {
  await connection.query(
    `UPDATE ${DRIVER_WALLET_TABLE}
     SET balance = balance + ?
     WHERE driver_id = ?`,
    [amount, driverId]
  );

  await connection.query(
    `INSERT INTO wallet_transactions (
      driver_id,
      type,
      amount,
      description,
      reference
    ) VALUES (?, 'credit', ?, ?, ?)`,
    [
      driverId,
      amount,
      description,
      reference,
    ]
  );

  if (metadata) {
    await connection.query(
      `UPDATE driver_account_details
       SET metadata = ?
       WHERE driver_id = ?`,
      [JSON.stringify(metadata), driverId]
    );
  }
};

const extractReceiverAccountNumberFromTransaction = (transaction = {}) => {
  const metadata = transaction?.metadata || {};
  const customFields = Array.isArray(metadata?.custom_fields) ? metadata.custom_fields : [];
  const matchingField = customFields.find(
    (field) => field?.variable_name === 'receiver_account_number'
  );

  return (
    metadata?.receiver_account_number ||
    transaction?.dedicated_account?.account_number ||
    matchingField?.value ||
    null
  );
};

const syncDriverWalletFundingFromPaystack = async (driverId, connection = db) => {
  if (!driverId) {
    return { synced: 0 };
  }

  const accountDetails = await getDriverAccountDetails(driverId, connection);
  const driver = await getDriverRow(driverId, connection);
  const customerLookup = accountDetails?.customer_code || driver?.email;

  if (!customerLookup) {
    return { synced: 0 };
  }

  const customer = await fetchPaystackCustomerByEmailOrCode(customerLookup);
  if (!customer?.id) {
    return { synced: 0 };
  }

  const paystackTransactions = await listPaystackTransactions({
    customerId: customer.id,
    status: 'success',
    perPage: 50,
  });

  const relevantTransactions = paystackTransactions
    .filter((transaction) => {
      const channel = transaction?.channel || transaction?.authorization?.channel;
      const receiverAccountNumber = extractReceiverAccountNumberFromTransaction(transaction);

      if (channel !== 'dedicated_nuban') {
        return false;
      }

      if (accountDetails?.account_number && receiverAccountNumber) {
        return String(receiverAccountNumber) === String(accountDetails.account_number);
      }

      return true;
    })
    .sort((a, b) => new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0));

  if (relevantTransactions.length === 0) {
    return { synced: 0 };
  }

  await ensureWalletBalance(driverId, connection);

  const references = relevantTransactions
    .map((transaction) => transaction?.reference)
    .filter(Boolean);

  let existingReferenceSet = new Set();
  if (references.length > 0) {
    const placeholders = references.map(() => '?').join(', ');
    const [existingRows] = await connection.query(
      `SELECT reference
       FROM wallet_transactions
       WHERE driver_id = ?
         AND reference IN (${placeholders})`,
      [driverId, ...references]
    );
    existingReferenceSet = new Set(existingRows.map((row) => row.reference));
  }

  let synced = 0;

  for (const transaction of relevantTransactions) {
    const reference = transaction?.reference;
    const amountInNaira = Number(transaction?.amount || 0) / 100;

    if (!reference || amountInNaira <= 0 || existingReferenceSet.has(reference)) {
      continue;
    }

    await recordWalletFundingTransaction(
      {
        driverId,
        amount: amountInNaira,
        reference,
        description: 'Wallet funding via Paystack virtual account',
        metadata: transaction,
      },
      connection
    );

    existingReferenceSet.add(reference);
    synced += 1;
  }

  return { synced };
};

const findDriverIdForDedicatedAccountEvent = async (data, connection = db) => {
  const customer = data?.customer || {};
  const accountNumber = data?.account_number || null;
  const dedicatedAccountId = data?.id ? String(data.id) : null;
  const customerCode = customer?.customer_code || null;
  const customerEmail = customer?.email || null;

  if (customerCode) {
    const [rows] = await connection.query(
      `SELECT driver_id
       FROM driver_account_details
       WHERE customer_code = ?
       LIMIT 1`,
      [customerCode]
    );

    if (rows[0]?.driver_id) {
      return rows[0].driver_id;
    }
  }

  if (dedicatedAccountId) {
    const [rows] = await connection.query(
      `SELECT driver_id
       FROM driver_account_details
       WHERE dedicated_account_id = ?
       LIMIT 1`,
      [dedicatedAccountId]
    );

    if (rows[0]?.driver_id) {
      return rows[0].driver_id;
    }
  }

  if (accountNumber) {
    const [rows] = await connection.query(
      `SELECT driver_id
       FROM driver_account_details
       WHERE account_number = ?
       LIMIT 1`,
      [accountNumber]
    );

    if (rows[0]?.driver_id) {
      return rows[0].driver_id;
    }
  }

  if (customerEmail) {
    const [rows] = await connection.query(
      `SELECT d.id AS driver_id
       FROM drivers d
       INNER JOIN driver_account_details dad ON dad.driver_id = d.id
       WHERE d.email = ?
       LIMIT 1`,
      [customerEmail]
    );

    if (rows[0]?.driver_id) {
      return rows[0].driver_id;
    }
  }

  return null;
};

const extractChargeSuccessEventLookupData = (event) => {
  const data = event?.data || {};
  const authorization = data?.authorization || {};
  const customer = data?.customer || authorization?.customer || {};
  const candidateAccountNumbers = [
    authorization?.receiver_bank_account_number,
    data?.account_number,
    data?.dedicated_account?.account_number,
    customer?.dedicated_account?.account_number,
  ]
    .map((value) => (value ? String(value).trim() : null))
    .filter(Boolean);

  return {
    channel: authorization?.channel || data?.channel || null,
    customer: {
      ...customer,
      email: customer?.email || data?.customer?.email || null,
      customer_code: customer?.customer_code || data?.customer_code || null,
    },
    dedicatedAccountId:
      data?.dedicated_account?.id ||
      customer?.dedicated_account?.id ||
      null,
    accountNumbers: [...new Set(candidateAccountNumbers)],
  };
};

const handleDedicatedAccountAssignedEvent = async (event) => {
  const data = event?.data || {};
  if (!data || typeof data !== 'object') {
    return { handled: false };
  }

  await ensureDriverAccountDetailsTable();
  const driverId = await findDriverIdForDedicatedAccountEvent(data);

  if (!driverId) {
    return { handled: false };
  }

  const accountDetails = extractPaystackAccountDetails({
    status: true,
    message: event?.message || event?.event || 'Dedicated account assigned successfully.',
    data,
  });

  accountDetails.status = accountDetails.assigned ? 'active' : 'pending';
  accountDetails.metadata = event;

  await upsertDriverAccountDetails(driverId, accountDetails);
  return { handled: true, driverId };
};

const handleDedicatedAccountFailedEvent = async (event) => {
  const data = event?.data || {};
  await ensureDriverAccountDetailsTable();
  const driverId = await findDriverIdForDedicatedAccountEvent(data);

  if (!driverId) {
    return { handled: false };
  }

  const existingDetails = await getDriverAccountDetails(driverId);
  await upsertDriverAccountDetails(driverId, {
    ...existingDetails,
    provider: existingDetails?.provider || 'paystack',
    status: 'failed',
    assigned: false,
    metadata: event,
  });

  return { handled: true, driverId };
};

const handlePaystackWebhookEvent = async (event) => {
  if (!event?.event) {
    return { handled: false };
  }

  const successEvents = ['dedicatedaccount.assign.success', 'assigndedicatedaccount.success'];
  const failedEvents = ['dedicatedaccount.assign.failed', 'assigndedicatedaccount.failed'];

  if (successEvents.includes(event.event)) {
    return handleDedicatedAccountAssignedEvent(event);
  }

  if (failedEvents.includes(event.event)) {
    return handleDedicatedAccountFailedEvent(event);
  }

  if (event.event !== 'charge.success') {
    return { handled: false };
  }

  const data = event.data || {};
  const lookupData = extractChargeSuccessEventLookupData(event);
  const channel = lookupData.channel;

  if (channel !== 'dedicated_nuban') {
    return { handled: false };
  }

  await ensureDriverAccountDetailsTable();

  let driverId = null;
  for (const accountNumber of lookupData.accountNumbers) {
    driverId = await findDriverIdForDedicatedAccountEvent(
      {
        account_number: accountNumber,
        customer: lookupData.customer,
        id: lookupData.dedicatedAccountId,
      },
      db
    );

    if (driverId) {
      break;
    }
  }

  if (!driverId) {
    driverId = await findDriverIdForDedicatedAccountEvent(
      {
        customer: lookupData.customer,
        id: lookupData.dedicatedAccountId,
      },
      db
    );
  }

  if (!driverId) {
    console.warn(
      `[Paystack] charge.success could not be matched to a driver. Reference: ${
        data.reference || 'unknown'
      }`
    );
    return { handled: false };
  }

  const amountInNaira = Number(data.amount || 0) / 100;
  if (amountInNaira <= 0) {
    return { handled: false };
  }

  const reference = data.reference || `paystack-${Date.now()}`;
  const [existingRows] = await db.query(
    `SELECT id
     FROM wallet_transactions
     WHERE reference = ? AND driver_id = ?
     LIMIT 1`,
    [reference, driverId]
  );

  if (existingRows.length > 0) {
    return { handled: true, duplicate: true, driverId };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await ensureWalletBalance(driverId, connection);

    await recordWalletFundingTransaction(
      {
        driverId,
        amount: amountInNaira,
        reference,
        description: 'Wallet funding via Paystack virtual account',
        metadata: event,
      },
      connection
    );

    await connection.commit();
    return { handled: true, driverId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const verifyPaystackSignature = (rawBody, signature) => {
  if (!PAYSTACK_SECRET_KEY || !rawBody || !signature) {
    return false;
  }

  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');

  return hash === signature;
};

module.exports = {
  assignDedicatedVirtualAccount,
  ensureDriverAccountDetailsTable,
  ensureWalletTables,
  extractPaystackAccountDetails,
  bulkBackfillDriverAccountDetails,
  ensureWalletBalance,
  getDriverAccountDetails,
  getDriverFundingProfile,
  handlePaystackWebhookEvent,
  syncDriverWalletFundingFromPaystack,
  syncDriverAccountDetailsFromPaystack,
  upsertDriverAccountDetails,
  verifyPaystackSignature,
};
