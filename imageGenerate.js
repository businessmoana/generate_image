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
        const excelFiles = await fs.readdir('./excel_files');
        const latestExcelFile = excelFiles
            .filter(file => file.endsWith('.xlsx'))
            .sort()
            .pop();

        if (!latestExcelFile) {
            console.error('No Excel file found');
            return;
        }

        const excelPath = path.join('./excel_files', latestExcelFile);
        const workbook = xlsx.readFile(excelPath);
        const worksheet = workbook.Sheets['Results'];
        const excelData = xlsx.utils.sheet_to_json(worksheet);

        
        const imageData = excelData.slice(1).map(row => ({
            imageName: row[0],
            prompt: row[1],
            newImageName: row[2],
        }));

        const queue = imageData.filter(data => 
            data.imageName && data.prompt && data.newImageName
        ).map(data => ({
            imageName: data.imageName,
            prompt: data.prompt,
            newImageName: data.newImageName,
            convertedDir:convertedDir
        }));
        // Process queue with workers
        const workers = new Set();
        const results = []; // Collect all updates here

        while (queue.length > 0 || workers.size > 0) {
            while (workers.size < NUM_WORKERS && queue.length > 0) {
                const task = queue.shift();
                const worker = new Worker(path.join(__dirname, 'workers', 'imageGenerateWorker.js'));

                worker.on('message', (result) => {
                    if (result.success) {
                        console.log(`Successfully processed ${path.basename(result.imageName)}`);
                    } else {
                        console.error(`Error processing ${path.basename(imageData.imageName)}: ${result.error}`);
                    }
                    results.push(result);
                    workers.delete(worker);
                    worker.terminate();
                });

                worker.on('error', (error) => {
                    console.error(`Worker error for ${path.basename(imageData.imageName)}: ${error}`);
                    workers.delete(worker);
                    worker.terminate();
                });

                worker.postMessage(imageData);
                workers.add(worker);
                console.log(`Started processing ${path.basename(imageData.imageName)}`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\nProcessing complete!');
        console.log(`Successfully processed ${results.filter(r => r.success).length} images`);
        console.log(`Failed to process ${results.filter(r => !r.success).length} images`);
    } catch (error) {
        console.error('Error in image Generating:', error);
    }
}

module.exports = imageGenerate;