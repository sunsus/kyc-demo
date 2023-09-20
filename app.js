import express from 'express'
import cors from 'cors'
import { OpenAI } from 'langchain/llms/openai'
import {PromptTemplate} from 'langchain/prompts';
import { systemPrompt } from './prompt.js'

const app = express()
const port = process.env.PORT || 3000
const apiKeyOpenAI = process.env.OPENAI_API_KEY

// Define a regular expression pattern to match JSON objects
const jsonPattern = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/;

app.use(express.json())
app.use(cors())

app.set('json spaces', 2)
app.options('*', cors())

const llm = new OpenAI({
    modelName: 'gpt-4',
    temperature: 0.2,
    openAIApiKey: apiKeyOpenAI
});
const prompt = PromptTemplate.fromTemplate(systemPrompt)

app.post('/familySituation', (req, res) => {
    console.log('Calling familySituation endpoint')
    const { text } = req.body
    if (text) {
        try {
            prompt.format({ text }).then(formattedPrompt =>{
                console.log('Calling OpenAI service', formattedPrompt)
                getKyc(formattedPrompt).then(result => {
                    console.log(`OpenAI service call returned successfully with result: ${result}`)
                    const match = result.match(jsonPattern);
                    if (match && match.length > 0) {
                        res.send(JSON.parse(match[0]))
                    } else {
                        console.log('No response JSON found, therefore returning an empty object')
                        res.send({})
                    }
                }, error => {
                    console.error(error)
                    res.status(500).send(error)
                })
            })
        } catch (e) {
            console.error(`Error while calling familySituation endpoint`, e)
            res.status(500).send(e)
        }
    } else {
        res.status(400).json({
            message: 'Missing required property: text'
        })
    }
})

async function getKyc(prompt) {
    return await llm.predict(prompt);
}

app.listen(port, () => {
    console.log(`Server successfully started on port ${port}`)
})