const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function applyBISchema() {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT || '5432'),
    });

    try {
        await client.connect();
        console.log('🚀 Applying Business Intelligence Schema...');

        const schema = fs.readFileSync('migrations/003_business_intelligence_schema.sql', 'utf8');
        await client.query(schema);

        console.log('✅ Business Intelligence Schema applied successfully!');

        // Check created tables
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'bi_%'
            ORDER BY table_name
        `);

        console.log('📊 Created BI Tables:');
        tables.rows.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });

        // Check categories
        const categories = await client.query('SELECT category_name, subcategory FROM bi_contract_categories ORDER BY category_name, subcategory');
        console.log(`\n🏷️  Loaded ${categories.rows.length} categories:`);

        const grouped = {};
        categories.rows.forEach(cat => {
            if (!grouped[cat.category_name]) grouped[cat.category_name] = [];
            grouped[cat.category_name].push(cat.subcategory);
        });

        Object.entries(grouped).forEach(([category, subcategories]) => {
            console.log(`   📂 ${category}: ${subcategories.join(', ')}`);
        });

    } catch (error) {
        console.error('❌ Error applying BI schema:', error.message);
    } finally {
        await client.end();
    }
}

applyBISchema();