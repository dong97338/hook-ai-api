import { getEmbeddings } from '../functions.js';
import dotenv from 'dotenv';

dotenv.config();

test('getEmbeddings generates embeddings', async () => {
  const text = 'This is a test text for generating embeddings.';
  const result = await getEmbeddings(text);
  console.log('Embeddings:', result);
});
