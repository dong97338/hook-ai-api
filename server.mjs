import Fastify from 'fastify'
import axios from 'axios'

import {Pinecone} from '@pinecone-database/pinecone'
import dotenv from 'dotenv'
import {fetchAndExtractText, processText, getEmbeddings, generateResponse} from './functions.js'
import OpenAIApi from 'openai'

dotenv.config()

const fastify = Fastify({logger: true})

const pinecone = new Pinecone({apiKey: process.env.PINECONE_API_KEY})

// Pinecone Index 초기화
const index = pinecone.Index('data')

fastify.post('/process-urls', async (req, reply) => {
  fastify.log.info('Received request to process URLs.')
  const urls = req.body.urls
  fastify.log.info(`Processing ${urls.length} URLs.`)

  try {
    const texts = await Promise.all(urls.map(url => fetchAndExtractText(url)))
    fastify.log.info('Text extraction completed.')

    fastify.log.info('texts', texts)

    const processedData = await Promise.all(texts.map(text => processText(text)))
    fastify.log.info('Text processing completed.')

    // Pinecone에 데이터 업로드
    let vectors = processedData.flatMap(data => data.vectors)
    fastify.log.info(`Upserting ${vectors.length} vectors into Pinecone.`)

    let batch_size = 10
    let num_batches = Math.ceil(vectors.length / 10) // 수정된 부분: 올바른 배치 수 계산

    for (let i = 0; i < num_batches; ++i) {
      fastify.log.info(`Processing batch ${i + 1} of ${num_batches}`)
      let start_idx = i * batch_size
      let end_idx = start_idx + batch_size
      let batch_vectors = vectors.slice(start_idx, end_idx).map(vector => ({
        id: vector.id,
        values: vector.values,
        metadata: vector.metadata
      }))
      await index.namespace('hook').upsert(batch_vectors)
    }

    reply.send({processedData})
    fastify.log.info('Data returned to the client.')
  } catch (error) {
    fastify.log.error(error)
    reply.status(500).send({error: 'An error occurred while processing URLs.'})
  }
})

const PORT = process.env.PORT || 3389
fastify.listen({port: PORT, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`Server running on ${address}`)
})

const messages = []
const systemPrompt = {
  role: 'system',
  content: `당신은 유저가 클리핑한 사이트에서 나타난 정보를 바탕으로 대답하는 챗봇입니다.
  당신은 사람들에게 다음과 같이 대답해야 합니다:
  - 친절한 말투
  - 항상 존댓말 사용
  - 적절한 이모지 사용
  당신은 반드시 제공하는 [Context]에 있는 내용을 기반으로 살을 붙여 답변을 생성해야 합니다.`
}
messages.push(systemPrompt)

fastify.post('/query', async (req, reply) => {
  const userQuery = req.body.query

  fastify.log.info('userQuery: ', userQuery)

  try {
    messages.push({role: 'user', content: userQuery})

    const queryEmbeddings = await getEmbeddings(userQuery)

    const retrievedChunks = await index.namespace('hook').query({
      vector: queryEmbeddings,
      topK: 7,
      includeMetadata: true
    })

    let contexts = ''

    for (let context of retrievedChunks.matches) {
      contexts += context.metadata.chunk + '\n\n'
    }

    const contextPrompt = {
      role: 'system',
      content: `[Context]${contexts}`
    }

    messages.push(contextPrompt)

    const fullResponse = await generateResponse(messages)

    fastify.log.info('Full response: ', fullResponse)

    reply.send({response: fullResponse})
  } catch (error) {
    fastify.log.error(error)
    reply.status(500).send({error: 'An error occurred while processing the query.'})
  }
})
