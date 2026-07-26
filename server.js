const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If connecting to Railway Postgres from outside or if required by Railway SSL:
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway.app') ? { rejectUnauthorized: false } : false
});

// Initialize database table if it doesn't exist
async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.warn("WARNING: DATABASE_URL is not set. Stats will not be saved to Postgres.");
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_stats (
        id SERIAL PRIMARY KEY,
        stat_key VARCHAR(50) UNIQUE NOT NULL,
        stat_value INTEGER DEFAULT 0
      );
    `);
    
    // Initialize default rows if they don't exist
    await pool.query(`
      INSERT INTO site_stats (stat_key, stat_value) 
      VALUES ('visits', 0), ('visitors', 0)
      ON CONFLICT (stat_key) DO NOTHING;
    `);
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize database:", err);
  }
}

initDB();

// Serve static files
app.use(express.static(path.join(__dirname, '/')));

// API endpoint to increment stats (hit counter)
app.get('/api/hit', async (req, res) => {
  const type = req.query.type === 'visitors' ? 'visitors' : 'visits';
  
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const result = await pool.query(
      `UPDATE site_stats SET stat_value = stat_value + 1 WHERE stat_key = $1 RETURNING stat_value`,
      [type]
    );
    res.json({ count: result.rows[0].stat_value });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update stats' });
  }
});

// API endpoint to get current stats (for admin panel)
app.get('/api/stats', async (req, res) => {
  const type = req.query.type === 'visitors' ? 'visitors' : 'visits';
  
  if (!process.env.DATABASE_URL) {
    return res.json({ count: 0 });
  }

  try {
    const result = await pool.query(
      `SELECT stat_value FROM site_stats WHERE stat_key = $1`,
      [type]
    );
    if (result.rows.length > 0) {
      res.json({ count: result.rows[0].stat_value });
    } else {
      res.json({ count: 0 });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
