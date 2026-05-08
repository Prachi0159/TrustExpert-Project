import mysql2 from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config();

// Create connection pool with optimized settings
const pool = mysql2.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'trustexpert',
    connectionLimit: 10,
    queueLimit: 0,
    waitForConnections: true,
    enableKeepAlive: true,
    // Enable multiple statements for table creation
    multipleStatements: true,
    // Timezone handling
    timezone: '+00:00',
    // Character set
    charset: 'utf8mb4'
});

// Enhanced connection check with retry logic
const checkConnection = async (retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const connection = await pool.getConnection();
            console.log(`Database connection successful (attempt ${attempt})`);

            // Test the connection with a simple query
            await connection.execute('SELECT 1');
            console.log('Database query test successful');

            connection.release();
            return true;
        } catch (error) {
            console.error(`Database connection attempt ${attempt} failed:`, error.message);

            if (attempt === retries) {
                console.error(' All database connection attempts failed');
                throw new Error(`Failed to connect to database after ${retries} attempts: ${error.message}`);
            }

            // Wait before retrying (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// Graceful shutdown function
const closeConnection = async () => {
    try {
        await pool.end();
        console.log('Database connection pool closed');
    } catch (error) {
        console.error('Error closing database connection:', error);
    }
};

// Handle process termination
process.on('SIGINT', async () => {
    console.log('Received SIGINT, closing database connection...');
    await closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, closing database connection...');
    await closeConnection();
    process.exit(0);
});

export { pool, checkConnection, closeConnection };
export default checkConnection;