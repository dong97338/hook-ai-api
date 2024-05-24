import { generateResponse } from '../functions.js';
import dotenv from 'dotenv';

dotenv.config();

test('generateResponse generates response', async () => {
  const messages = [{ role: 'user', content: 'Hello, how are you?' }];
  const result = await generateResponse(messages);
  console.log('Response:', result);
});
