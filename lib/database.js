const { Client } = require('@cloudflare/d1');

let dbInstance = null;

async function initDB() {
    if (!dbInstance) {
        dbInstance = new Client({
            accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
            apiToken: process.env.CLOUDFLARE_API_TOKEN,
            databaseName: process.env.CLOUDFLARE_DB_NAME
        });

        // Initialize tables if they don't exist
        await dbInstance.exec(`
            CREATE TABLE IF NOT EXISTS payments (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                group_id TEXT NOT NULL,
                amount REAL NOT NULL,
                status TEXT NOT NULL,
                phone_number TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            );

            CREATE TABLE IF NOT EXISTS groups (
                group_id TEXT PRIMARY KEY,
                payment_required INTEGER DEFAULT 1,
                payment_amount REAL DEFAULT 100.00,
                welcome_message TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            );
        `);
    }
    return dbInstance;
}

async function logPayment(paymentData) {
    const db = await initDB();
    const { id, order_id, user_id, group_id, amount, status, phone_number } = paymentData;
    
    await db.prepare(`
        INSERT INTO payments (id, order_id, user_id, group_id, amount, status, phone_number)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, order_id, user_id, group_id, amount, status, phone_number).run();
}

async function updatePaymentStatus(orderId, status) {
    const db = await initDB();
    await db.prepare(`
        UPDATE payments 
        SET status = ?, updated_at = strftime('%s', 'now')
        WHERE order_id = ?
    `).bind(status, orderId).run();
}

async function getGroupSettings(groupId) {
    const db = await initDB();
    const result = await db.prepare(`
        SELECT * FROM groups WHERE group_id = ?
    `).bind(groupId).first();
    
    return result || {
        group_id: groupId,
        payment_required: 1,
        payment_amount: 100.00,
        welcome_message: null
    };
}

module.exports = {
    initDB,
    logPayment,
    updatePaymentStatus,
    getGroupSettings
};