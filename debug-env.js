const dotenv = require('dotenv');
const fs = require('fs');

console.log('Contents of .env file:');
console.log(fs.readFileSync('.env', 'utf8'));

console.log('\nTrying to load environment variables...');
dotenv.config();

console.log('\nSUPABASE_KEY from process.env:', process.env.SUPABASE_KEY);
console.log('BOT_TOKEN from process.env:', process.env.BOT_TOKEN);
console.log('All environment keys:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));