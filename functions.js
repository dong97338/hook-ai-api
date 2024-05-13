import axios from 'axios'
import cheerio from 'cheerio'
import {v4 as uuidv4} from 'uuid'
import OpenAIApi from 'openai'

import dotenv from 'dotenv'

dotenv.config()

const openai = new OpenAIApi({key: process.env.OPENAI_API_KEY})

const useGPT = 0

export async function fetchAndExtractText(url) {
  try {
    console.log(`Fetching data from ${url}`)
    const response = await axios.get(url)
    const $ = cheerio.load(response.data)
    $('script, style, head, title, meta').remove()
    const text = $('body').text().trim()
    console.log(`Extracted text from ${url}`)
    return text
  } catch (error) {
    console.error(`Error fetching data from ${url}: ${error}`)
    return ''
  }
}

export async function processText(text) {
  console.log('text', text)
  console.log('Generating title for extracted text.')
  const title = useGPT ? await generateTitle(text) : 'Generated Title'
  console.log('Title generated.')

  console.log('Summarizing the text.')
  const summary = useGPT ? await generateSummary(text, title) : 'Generated Summary'
  console.log('Summary generated.')


  const chunks = splitTextIntoChunks(text, 512)
  console.log('chunks', chunks)
  const vectors = await Promise.all(
    chunks.map(async (chunk, index) => {
      console.log(`Processing chunk ${index + 1} of ${chunks.length}`)
      return processChunk(chunk, title, summary)
    })
  )

  console.log('vector', vectors)

  console.log('Text processing completed for one chunk.')
  return {title, summary, vectors}
}

async function processChunk(chunk, title, summary) {
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: `${title}\n${summary}\n${chunk}`
  })
  return {
    id: uuidv4(),
    values: embeddingResponse.data[0].embedding,
    metadata: {title, summary, chunk}
  }
}

function splitTextIntoChunks(text, size) {
  let chunks = []
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size))
  }
  return chunks
}

async function generateTitle(text) {
  const titleResponse = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: '너는 웹페이지의 제목을 만드는 봇이야. 내용을 읽고 제목을 만들어줘'
      },
      {
        role: 'user',
        content: `[content]${text}`
      }
    ],
    temperature: 0,
    max_tokens: 4095
  })
  return titleResponse.choices[0].message.content.trim()
}

async function generateSummary(text, title) {
  const summaryResponse = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: '너는 웹페이지를 요약하는 봇이야. 내용을 하나의 긴 문단으로 요약해줘'
      },
      {
        role: 'user',
        content: `[title]${title}\n[content]${text}`
      }
    ],
    temperature: 0,
    max_tokens: 4095
  })

  return summaryResponse.choices[0].message.content.trim()
}

export async function getEmbeddings(text) {
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  })
  return embeddingResponse.data[0].embedding
}

export async function generateResponse(messages) {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-0125',
    messages
  })
  return response.choices[0].message.content
}
