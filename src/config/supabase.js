const { createClient } = require('@supabase/supabase-js');
const { config } = require('./env');

/**
 * Supabase client configuration
 * Uses anon key for client-side operations
 */
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);

/**
 * Supabase admin client for server-side operations
 * Uses service role key for full access
 */
const supabaseAdmin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE);

module.exports = { supabase, supabaseAdmin };
