import {v4 as uuidv4} from 'uuid'
import OpenAIApi from 'openai'
import dotenv from 'dotenv'

dotenv.config()
const openai = new OpenAIApi({apiKey: process.env.OPENAI_API_KEY})
const model = 'text-embedding-3-small'

export async function processChunk(chunk, title, summary) {
  const embeddingResponse = await openai.createEmbedding({model, input: `${title}\n${summary}\n${chunk}`})
  return {id: uuidv4(), values: embeddingResponse.data[0].embedding, metadata: {title, summary, chunk}}
}

export async function getEmbeddings(text) {
  const response = await openai.createEmbedding({model, input: text})
  return response.data[0].embedding
}
