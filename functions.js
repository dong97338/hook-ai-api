import axios from 'axios'
import cheerio from 'cheerio'
import {v4 as uuidv4} from 'uuid'
import OpenAIApi from 'openai'
import dotenv from 'dotenv'

dotenv.config()
const openai = new OpenAIApi({key: process.env.OPENAI_API_KEY})
const useGPT = 1

export async function fetchAndExtractText(url) {
  try {
    const response = await axios.get(url)
    const $ = cheerio.load(response.data)
    $('script, style, head, title, meta').remove()
    return $('body').text().trim()
  } catch (error) {
    console.error(`Error: ${error}`)
    return ''
  }
}

export async function processText(text) {
  const {title, summary} = useGPT ? await generateTitleAndSummary(text.slice(0, 10000)) : {title: 'Generated Title', summary: 'Generated Summary'}
  const keywords = useGPT ? await generateKeyWords(text.slice(0, 10000)) : ['키워드1', '키워드2', '키워드3']
  console.log(keywords)
  const chunks = splitTextIntoChunks(text, 512)
  const vectors = await Promise.all(chunks.map((chunk, i) => processChunk(chunk, title, summary, i, chunks.length)))
  return {title, keywords, summary, vectors}
}

async function processChunk(chunk, title, summary, index, total) {
  console.log(`Processing chunk ${index + 1} of ${total}`)
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: `${title}\n${summary}\n${chunk}`
  })
  return {id: uuidv4(), values: embeddingResponse.data[0].embedding, metadata: {title, summary, chunk}}
}

function splitTextIntoChunks(text, size) {
  return Array.from({length: Math.ceil(text.length / size)}, (_, i) => text.slice(i * size, (i + 1) * size))
}

async function generateTitleAndSummary(text) {
  // Generate the title
  const titleResponse = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-0125',
    messages: [
      {role: 'system', content: '너는 웹페이지의 제목을 만드는 봇이야. 내용을 읽고 제목을 만들어줘'},
      {role: 'user', content: `[content]${text}`}
    ],
    temperature: 0,
    max_tokens: 4095
  })

  const title = titleResponse.choices[0].message.content.trim()

  // Generate the summary using the title
  const summaryResponse = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-0125',
    messages: [
      {role: 'system', content: '너는 웹페이지를 요약하는 봇이야. 내용을 하나의 긴 문단으로 요약해줘'},
      {role: 'user', content: `[title]${title}\n[content]${text}`}
    ],
    temperature: 0,
    max_tokens: 4095
  })

  const summary = summaryResponse.choices[0].message.content.trim()

  // Return both title and summary
  console.log(title, summary)
  return {title, summary}
}

//주어진 텍스트로부터 키워드 3개를 리스트로 반환
async function generateKeyWords(text) {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-0125',
    messages: [
      {role: 'system', content: '너는 텍스트로부터 키워드를 추출하는 봇이야. 텍스트를 읽고 키워드를 3개 추출하고 쉼표로 구분해줘.'},
      {role: 'user', content: `[content]${text}`}
    ]
  })
  return response.choices[0].message.content.split(',').map(keyword => keyword.trim())
}

export async function getEmbeddings(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  })
  return response.data[0].embedding
}

export async function generateResponse(messages) {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-0125',
    messages
  })
  return response.choices[0].message.content
}
