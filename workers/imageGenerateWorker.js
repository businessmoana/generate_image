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


async function generateImage(prompt) {
    try 
        const response = await openai.responses.create({
            model: "gpt-5",
            input: `${prompt}`,
            tools: [
                {
                type: "image_generation",
                quality: "medium",
                size: "1024x1536"
                },
            ],
            });

            const imageData = response.output
            .filter((output) => output.type === "image_generation_call")
            .map((output) => output.result);

            if (imageData.length > 0) {
                const imageBase64 = imageData[0];
                const imageBuffer = Buffer.from(imageBase64, "base64");
                const resizedImage = await sharp(imageBuffer)
                .resize(512, 768, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .toBuffer();
                return resizedImage;
            }
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

        const buffer = await generateImage(prompt);
        
        const newimageNameWithFormat = ensurePngExtension(imageName.toLowerCase().replace(/\s+/g, '_'));


        const outputPath = path.join(convertedDir, path.basename(newimageNameWithFormat));
        fs.writeFileSync(outputPath, buffer);
        
        parentPort.postMessage({
            success: true,
            imageName,
        });
    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error.message
        });
    }
}); 