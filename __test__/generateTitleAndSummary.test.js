import { generateTitleAndSummary } from '../functions.js';
import dotenv from 'dotenv';

dotenv.config();

test('generateTitleAndSummary generates title and summary', async () => {
  const text = 'This is a test text for generating title and summary. It needs to be long enough to test the functionality properly.';
  const result = await generateTitleAndSummary(text);
  console.log('Title and Summary:', result);
});
