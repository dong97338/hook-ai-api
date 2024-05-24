import { fetchAndExtractText } from '../functions.js';

test('fetchAndExtractText extracts text from webpage', async () => {
  const url = 'https://example.com'; // 실제 테스트할 URL을 입력합니다
  const text = await fetchAndExtractText(url);
  console.log('Extracted Text:', text);
});
