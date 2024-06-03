import Fastify from 'fastify'
import {Pinecone} from '@pinecone-database/pinecone'
import dotenv from 'dotenv'
import {fetchAndExtractText, generateTitleAndSummary, generateResponse, generateKeyWords} from './generatingFunctions.js'
import {processChunk, getEmbeddings} from './embeddingFunctions.js'

dotenv.config()
const fastify = Fastify({logger: true})
const pinecone = new Pinecone({apiKey: process.env.PINECONE_API_KEY})
const ns = pinecone.Index('data').namespace('hook')

const splitTextIntoChunks = (text, size) => Array.from({length: Math.ceil(text.length / size)}, (_, i) => text.slice(i * size, (i + 1) * size))

async function processText(text) {
  const {title, summary} = process.env.USE_GPT ? await generateTitleAndSummary(text.slice(0, 10000)) : {title: 'Generated Title', summary: 'Generated Summary'}
  const chunks = splitTextIntoChunks(text, 512)
  const vectors = await Promise.all(chunks.map((chunk, i) => processChunk(chunk, title, summary)))
  return {title, summary, vectors}
}

fastify.post('/process-urls', async (req, reply) => {
  try {
    const {userId, space, url} = req.body
    const text = await fetchAndExtractText(url)
    const keywords = await generateKeyWords(text)
    reply.send({keywords})
    const processedData = await processText(text)
    const vectors = processedData.vectors
    for (let i = 0; i < vectors.length; i += 10) {
      await ns.upsert(vectors.slice(i, i + 10).map(({id, values, metadata}) => ({id: `${userId}-${id}`, values, metadata: {...metadata, keywords, url, userId, space}})))
    }
  } catch (error) {
    fastify.log.error(error)
    reply.status(500).send({error: 'An error occurred while processing URLs.'})
  }
})

fastify.post('/keywords', async (req, reply) => {
  try {
    const {url} = req.body
    const text = await fetchAndExtractText(url)
    const keywords = await generateKeyWords(text)
    reply.send({keywords})
  } catch (error) {
    fastify.log.error(error)
    reply.status(500).send({error: 'An error occurred while generating keywords.'})
  }
})

const messages = [
  {
    role: 'system',
    content: `당신은 유저가 클리핑한 사이트에서 나타난 정보를 바탕으로 대답하는 챗봇입니다. 당신은 사람들에게 다음과 같이 대답해야 합니다: - 친절한 말투 - 항상 존댓말 사용 - 적절한 이모지 사용 당신은 반드시 제공하는 [Context]에 있는 내용을 기반으로 살을 붙여 답변을 생성해야 합니다.`
  }
]

fastify.post('/query', async (req, reply) => {
  try {
    const {userId, conversations} = req.body
    messages.push(...conversations)
    const queryEmbeddings = await getEmbeddings(messages.at(-1).content)
    const retrievedChunks = await ns.query({vector: queryEmbeddings, topK: 7, includeMetadata: true, filter: {userId: userId}})
    const contexts = retrievedChunks.matches.map(context => context.metadata.chunk).join('\n\n')
    messages.push({role: 'system', content: `[Context]${contexts}`})
    const fullResponse = await generateResponse(messages)
    reply.send({response: fullResponse, contexts})
  } catch (error) {
    fastify.log.error(error)
    reply.status(500).send({error: 'An error occurred while processing the query.'})
  }
})

fastify.listen({port: process.env.PORT || 3389, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`Server running on ${address}`)
})
console.log('Server file modified at ' + new Date())
