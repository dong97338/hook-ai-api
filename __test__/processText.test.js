import { processText } from '../functions.js';

test('processText processes text correctly', async () => {
  const text = 'This is a test text for processing. It should be long enough to test splitting and other functionalities.';
  const result = await processText(text);
  console.log('Process Text Result:', result);
});
