import { config } from 'dotenv';
config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    'GEMINI_API_KEY is not set. Please create a .env file and add it.'
  );
}

import '@/ai/flows/suggest-carbon-improvements.ts';
