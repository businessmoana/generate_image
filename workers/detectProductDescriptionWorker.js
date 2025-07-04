const { parentPort } = require('worker_threads');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

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

async function detectProductDescriptionFromImage(imagePath) {
    try {
        const promptContent = loadPrompt('detect_product_description_prompt');
        const imageBuffer = await fs.promises.readFile(imagePath);
        const base64Image = imageBuffer.toString('base64');
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: promptContent },
                        { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
                    ]
                }
            ],
            max_tokens: 300
        });
        
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error in detectProductDescriptionFromImage:', error);
        throw error;
    }
}

parentPort.on('message', async (data) => {
    try {
        const { imagePath, imageName } = data;
        const description = await detectProductDescriptionFromImage(imagePath);
        
        parentPort.postMessage({
            success: true,
            description,
            imageName
        });
    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error.message
        });
    }
});