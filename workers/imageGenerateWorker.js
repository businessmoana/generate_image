const { parentPort } = require('worker_threads');
const { OpenAI } = require('openai');
const { toFile } = require('openai')
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const sharp = require('sharp');

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

async function translateImageName(imageName) {
    try {
        const prompt = `You are an expert translator tasked with translating file names from Slovenian to Croatian.

        Instructions:

        Translate only words from Slovenian to Croatian.

        Preserve the original filename structure including:

        Underscores (_)

        Hyphens (-)

        Numbers (e.g., 01, 02, 123)

        File extensions (.png, .jpg, .jpeg, etc.)

        Do not add spaces where they do not exist.

        Do not alter casing (uppercase, lowercase should remain as in the original).

        If the filename has no separators (no spaces, underscores, or hyphens), carefully translate it without inserting any separators.

        Translate accurately, contextually appropriate, and naturally.                                                
        translate this : ${imageName}
        `;

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

async function generateImage(prompt) {
    try {
        const response = await openai.images.generate({
            model: "gpt-image-1",
            n:1,
            size: "1024x1536",
            prompt: prompt,
        });
        const image_base64 = response.data[0].b64_json;
        const image_bytes = Buffer.from(image_base64, "base64");
        const resizedImage = await sharp(image_bytes)
            .resize(512, 768, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toBuffer();
        return resizedImage;
    } catch (error) {
        console.error('Image generation error:', error);
        throw error;
    }
}


function ensurePngExtension(filename) {
    // Get the file extension
    const ext = path.extname(filename).toLowerCase();

    // If there's no extension or it's not .png, add .png
    if (!ext || ext !== '.png') {
        // Remove any existing extension and add .png
        const basename = path.basename(filename, ext); // Removes existing extension
        filename = `${basename}.png`;
    }

    return filename;
}

parentPort.on('message', async (data) => {
    console.log("here worker")
    try {
        const { imageName, prompt, convertedDir } = data;
        
        // Generate new image using the translated text
        let newImageName = await translateImageName(imageName); 
        const buffer = await generateImage(prompt);
        // Create translated image name
        newImageName = ensurePngExtension(newImageName);


        const outputPath = path.join(convertedDir, path.basename(newImageName));
        fs.writeFileSync(outputPath, buffer);
        
        parentPort.postMessage({
            success: true,
            imageName,
            newImageName,
        });
    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error.message
        });
    }
}); 