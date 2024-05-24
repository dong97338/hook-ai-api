import { generateKeyWords } from '../funcions.js';
import dotenv from 'dotenv';

dotenv.config();

test('generateKeyWords generates keywords', async () => {
  const text = 'This is a test text for generating keywords. The keywords should be relevant to the text content.';
  const result = await generateKeyWords(text);
  console.log('Keywords:', result);
});
