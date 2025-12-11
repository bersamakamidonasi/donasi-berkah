require('dotenv').config();

/**
 * Environment configuration
 * Loads and validates all required environment variables
 */

const config = {
  // Bot Configuration
  BOT_TOKEN: process.env.BOT_TOKEN,

  // Supabase Configuration
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,

  // Pakasir Configuration
  PAKASIR_PROJECT: process.env.PAKASIR_PROJECT,
  PAKASIR_API_KEY: process.env.PAKASIR_API_KEY,

  // Owner Configuration
  OWNER_ID: process.env.OWNER_ID || '1303861906',

  // Server Configuration
  PORT: process.env.PORT || 3000,
  BASE_URL: process.env.BASE_URL,

  // Node Environment
  NODE_ENV: process.env.NODE_ENV || 'development'
};

/**
 * Validate required environment variables
 * @throws {Error} If required variables are missing
 */
function validateConfig() {
  const requiredVars = [
    'BOT_TOKEN',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE',
    'PAKASIR_PROJECT',
    'PAKASIR_API_KEY',
    'BASE_URL'
  ];

  const missingVars = requiredVars.filter(varName => !config[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  console.log('✅ Environment configuration validated');
}

module.exports = { config, validateConfig };
