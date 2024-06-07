import {fetchAndExtractText} from '../src/generatingFunctions.js'

test('Notion', async () => {
  const url = 'https://www.notion.so/kairos-ku/f338004b0a75438b94b0c359cbc8ecce' // 노션은 안됨
  const text = await fetchAndExtractText(url)
  //text는 빈 문자열이 아니어야 합니다
  expect(text).toMatch(/생성형AI 최신 논문 분석/)
  // console.log('Extracted Text:', text)
}, 6000)
test('NamuWiki', async () => {
  const url = 'https://namu.wiki/w/TPU' // 실제 테스트할 URL을 입력합니다
  const text = await fetchAndExtractText(url)
  //text는 빈 문자열이 아니어야 합니다
  expect(text).toMatch(/한 줄로 요약하면 CPU와 데이터를 주고받는 특정 조건하에서는 TPU가 압도적으로 빠르다/)
  // console.log('Extracted Text:', text)
}, 6000)
test('News', async () => {
  const url = 'https://news.mt.co.kr/mtview.php?no=2024052808170818444' // 실제 테스트할 URL을 입력합니다
  const text = await fetchAndExtractText(url)
  //text는 빈 문자열이 아니어야 합니다
  expect(text).toMatch(/반려견 훈련사 강형욱이 운영하는 보듬컴퍼니에서 퇴직할 때 9670원을 받은 전 직원 측이 강형욱의 최근 해명에 대해 "변명"이라고 반박했다./)
  // console.log('Extracted Text:', text)
}, 6000)
