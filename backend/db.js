const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
module.exports = new Pool({ connectionString: process.env.DATABASE_URL });
