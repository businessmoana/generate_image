const { parentPort } = require('worker_threads');
const { OpenAI } = require('openai');
const { toFile } = require('openai')
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const promptsDir = path.join('./prompts');

function loadPrompt(promptName) {
    const promptPath = path.join(promptsDir, `${promptName}.txt`);
    try {
        const promptContent = fs.readFileSync(promptPath, 'utf-8');
        return promptContent;
    } catch (err) {
        console.error(`Error loading prompt ${promptName}:`, err.message);
        throw err;
    }
}

async function generatePrompt(productDescription) {
    try {
        const promptContent = loadPrompt('generate_image_prompt');
        const prompt = `${promptContent} \n Here is the product description: "${productDescription}"`;
        const response = await openai.chat.completions.create({
            model: "gpt-4.5-preview",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
}
parentPort.on('message', async (data) => {
    try {
        const { imageName, productDescription } = data;
        const generatedPrompt = await generatePrompt(productDescription);
        
        parentPort.postMessage({
            success: true,
            imageName,
            generatedPrompt
        });
    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error.message
        });
    }
});