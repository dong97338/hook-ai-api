import OpenAIApi from 'openai'
import dotenv from 'dotenv'
import puppeteer from 'puppeteer'

dotenv.config()
const openai = new OpenAIApi({apiKey: process.env.OPENAI_API_KEY})
const model = 'gpt-3.5-turbo-0125'

export async function fetchAndExtractText(url) {
  let browser
  try {
    browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']})
    const page = await browser.newPage()
    await Promise.race([page.goto(url, {waitUntil: 'networkidle2'}), new Promise(r => setTimeout(r, 5000))])
    const content = await page.evaluate(() => document.body.innerText)
    return content.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]|[\uD800-\uDFFF](?=[\uD800-\uDFFF])|[\uDC00-\uDFFF]/g, '')
  } catch (error) {
    console.error(`Error: ${error}`)
    return ''
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

export async function generateTitleAndSummary(text) {
  console.log('text', text)
  const messages = [
    {role: 'system', content: '너는 웹페이지의 제목을 만드는 봇이야. 내용을 읽고 제목을 만들어줘'},
    {role: 'user', content: `[content]${text}`}
  ]
  const titleResponse = await openai.chat.completions.create({model, messages, temperature: 0, max_tokens: 100})
  const title = titleResponse.choices[0].message.content.trim()

  messages[0].content = '너는 웹페이지를 요약하는 봇이야. 내용을 하나의 긴 문단으로 요약해줘'
  messages[1].content = `[title]${title}\n[content]${text}`
  const summaryResponse = await openai.chat.completions.create({model, messages, temperature: 0, max_tokens: 4095})
  const summary = summaryResponse.choices[0].message.content.trim()

  return {title, summary}
}

export async function generateKeyWords(text) {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {role: 'system', content: '너는 텍스트로부터 키워드를 추출하는 봇이야. 텍스트를 읽고 키워드를 3개 추출하고 쉼표로 구분해줘.'},
      {role: 'user', content: `[content]${text}`}
    ]
  })
  return response.choices[0].message.content.split(',').map(keyword => keyword.trim())
}

export async function generateResponse(messages) {
  const response = await openai.chat.completions.create({model, messages, temperature: 0})
  return response.choices[0].message.content
}
