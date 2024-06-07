import {v4 as uuidv4} from 'uuid'
import OpenAIApi from 'openai'
import dotenv from 'dotenv'

dotenv.config()
const openai = new OpenAIApi({apiKey: process.env.OPENAI_API_KEY})
const model = 'text-embedding-3-small'

export async function processChunk(chunk, title, summary) {
  const embeddingResponse = await openai.embeddings.create({model, input: `${title}\n${summary}\n${chunk}`})
  return {id: uuidv4(), values: embeddingResponse.data[0].embedding, metadata: {title, summary, chunk}}
}

export async function getEmbeddings(input) {
  const response = await openai.embeddings.create({model, input})
  return response.data[0].embedding
}
