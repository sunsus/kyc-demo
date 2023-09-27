import express from 'express'
import cors from 'cors'
import { OpenAI } from 'langchain/llms/openai'
import {PromptTemplate} from 'langchain/prompts';
import { systemPrompt } from './prompt.js'
import {config} from './config.js'
const app = express();


// Define a regular expression pattern to match JSON objects
const jsonPattern = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/;

app.use(express.json())
app.use(cors())

app.set('json spaces', 2)
app.options('*', cors())

const llm = new OpenAI({
    modelName: 'gpt-4',
    temperature: 0.0,
    openAIApiKey: config.apiKeyOpenAI
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
console.log("account name", process.env.AZURE_STORAGE_ACCOUNT_NAME);
// Use Api routes in the App
import { default as idDocumentOcrRoutes } from './controllers/id-document-ocr.controller.js';

app.use("/ocr", idDocumentOcrRoutes);
async function getKyc(prompt) {
    return await llm.predict(prompt);
}

app.listen(config.expressPort, () => {
    console.log(`Server successfully started on port ${config.expressPort}`)
})