const { Worker } = require('worker_threads');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
const fs2 = require('fs');

const NUM_WORKERS = 4;


const imageGenerate = async () => {

    const getTimeStamp = () => {
        const now = new Date();
        return now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
    };

    const convertedDirMain = `./converted_images`;
    if (!fs2.existsSync(convertedDirMain)) {
        fs2.mkdirSync(convertedDirMain);
    }

    const convertedDir = `./converted_images/${getTimeStamp()}`;
    if (!fs2.existsSync(convertedDir)) {
        fs2.mkdirSync(convertedDir);
    }

    try {
        // Read the input Excel file
        const excelFiles = await fs.readdir('./imageGenerationPrompt_excel');
        const latestExcelFile = excelFiles
            .filter(file => file.endsWith('.xlsx'))
            .sort()
            .pop();

        if (!latestExcelFile) {
            console.error('No Excel file found');
            return;
        }

        const excelPath = path.join('./imageGenerationPrompt_excel', latestExcelFile);
        const workbook = xlsx.readFile(excelPath);
        const worksheet = workbook.Sheets['Results'];
        const excelData = xlsx.utils.sheet_to_json(worksheet);

        // Prepare output file
        const outputDir = './result_excel';
        if (!fs2.existsSync(outputDir)) {
            fs2.mkdirSync(outputDir);
        }
        const outputPath = path.join(outputDir, `result${getTimeStamp()}.xlsx`);

        // Process all images
        const queue = excelData.map(data => ({
            imageName: data['Image Name'],
            prompt: data['Generated Prompt'],
            convertedDir: convertedDir,
        }));

        // Process queue with workers
        const workers = new Set();
        const results = [];
        const allUpdates = []; // Collect all updates here

        while (queue.length > 0 || workers.size > 0) {
            while (workers.size < NUM_WORKERS && queue.length > 0) {
                const task = queue.shift();
                const worker = new Worker(path.join(__dirname, 'workers', 'imageGenerateWorker.js'));

                worker.on('message', (result) => {
                    if (result.success) {
                        allUpdates.push({
                            imageName: task.imageName,
                            newImageName: result.newImageName,
                        });
                        console.log(`Processed ${task.imageName}`);
                    } else {
                        console.error(`Error processing ${task.imageName}: ${result.error}`);
                    }
                    workers.delete(worker);
                    worker.terminate();
                });

                worker.on('error', (error) => {
                    console.error(`Worker error: ${error}`);
                    workers.delete(worker);
                    worker.terminate();
                });

                worker.postMessage(task);
                workers.add(worker);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // After all workers finish, write all results at once
        const outputData = excelData.map(item => {
            const update = allUpdates.find(u => u.imageName === item['Image Name']);
            return {
                'Image Name': item['Image Name'],
                'Detected Product Description': item['Detected Product Description'],
                'Generated Prompt': item['Generated Prompt'],
                'Converted Image Name': update ? update.newImageName : ''
            };
        });

        const outputWorkbook = xlsx.utils.book_new();
        const outputWorksheet = xlsx.utils.json_to_sheet(outputData);
        xlsx.utils.book_append_sheet(outputWorkbook, outputWorksheet, 'Results');
        xlsx.writeFile(outputWorkbook, outputPath);

        console.log(`All images generated and the result saved to ${outputPath}`);

    } catch (error) {
        console.error('Error in getImageGeneratePrompt:', error);
    }
}

module.exports = imageGenerate;