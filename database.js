const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'radio.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Create and initialize database
function initDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }
            console.log('Connected to SQLite database');
        });

        // Create users table
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating users table:', err);
                    reject(err);
                }
            });

            // Create favorites table
            db.run(`CREATE TABLE IF NOT EXISTS favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                item_type TEXT NOT NULL,
                item_id TEXT NOT NULL,
                item_name TEXT NOT NULL,
                item_url TEXT NOT NULL,
                category TEXT,
                logo_url TEXT,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, item_type, item_id)
            )`, (err) => {
                if (err) {
                    console.error('Error creating favorites table:', err);
                    reject(err);
                } else {
                    console.log('Database initialized successfully');
                    resolve(db);
                }
            });
        });
    });
}

// Helper function to get database connection
function getDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(db);
            }
        });
    });
}

// User functions
async function createUser(username, email, password) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.run(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword],
            function(err) {
                db.close();
                if (err) {
                    if (err.message.includes('UNIQUE constraint')) {
                        reject(new Error('Username or email already exists'));
                    } else {
                        reject(err);
                    }
                } else {
                    resolve({ id: this.lastID, username, email });
                }
            }
        );
    });
}

async function getUserByUsername(username) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            db.close();
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

async function getUserById(userId) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        db.get('SELECT id, username, email, created_at FROM users WHERE id = ?', [userId], (err, row) => {
            db.close();
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

async function verifyPassword(user, password) {
    return bcrypt.compareSync(password, user.password);
}

// Favorites functions
async function addFavorite(userId, itemType, itemId, itemName, itemUrl, category, logoUrl, metadata) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        const metadataStr = metadata ? JSON.stringify(metadata) : null;
        db.run(
            `INSERT INTO favorites (user_id, item_type, item_id, item_name, item_url, category, logo_url, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id, item_type, item_id) DO UPDATE SET
             item_name = excluded.item_name,
             item_url = excluded.item_url,
             category = excluded.category,
             logo_url = excluded.logo_url,
             metadata = excluded.metadata`,
            [userId, itemType, itemId, itemName, itemUrl, category || null, logoUrl || null, metadataStr],
            function(err) {
                db.close();
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            }
        );
    });
}

async function removeFavorite(userId, itemType, itemId) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?',
            [userId, itemType, itemId],
            function(err) {
                db.close();
                if (err) {
                    reject(err);
                } else {
                    resolve({ deleted: this.changes > 0 });
                }
            }
        );
    });
}

async function getFavorites(userId, category = null) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM favorites WHERE user_id = ?';
        const params = [userId];
        
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        
        query += ' ORDER BY created_at DESC';
        
        db.all(query, params, (err, rows) => {
            db.close();
            if (err) {
                reject(err);
            } else {
                // Parse metadata JSON
                const favorites = rows.map(row => ({
                    ...row,
                    metadata: row.metadata ? JSON.parse(row.metadata) : null
                }));
                resolve(favorites);
            }
        });
    });
}

async function getFavoritesByCategory(userId) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM favorites WHERE user_id = ? ORDER BY category, created_at DESC',
            [userId],
            (err, rows) => {
                db.close();
                if (err) {
                    reject(err);
                } else {
                    // Group by category
                    const grouped = {};
                    rows.forEach(row => {
                        const category = row.category || 'other';
                        if (!grouped[category]) {
                            grouped[category] = [];
                        }
                        grouped[category].push({
                            ...row,
                            metadata: row.metadata ? JSON.parse(row.metadata) : null
                        });
                    });
                    resolve(grouped);
                }
            }
        );
    });
}

async function isFavorite(userId, itemType, itemId) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT id FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?',
            [userId, itemType, itemId],
            (err, row) => {
                db.close();
                if (err) {
                    reject(err);
                } else {
                    resolve(!!row);
                }
            }
        );
    });
}

module.exports = {
    initDatabase,
    createUser,
    getUserByUsername,
    getUserById,
    verifyPassword,
    addFavorite,
    removeFavorite,
    getFavorites,
    getFavoritesByCategory,
    isFavorite
};




