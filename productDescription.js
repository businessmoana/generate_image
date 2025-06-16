const { Worker } = require('worker_threads');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
const fs2 = require('fs');

const NUM_WORKERS = 4;

const getTimeStamp = () => {
    const now = new Date();
    return now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
};

const productDescription = async () => {
    try {
        // Setup directories
        const excelDir = './productDescriptions_excel';
        const imagesDir = './images';
        
        [excelDir, imagesDir].forEach(dir => {
            if (!fs2.existsSync(dir)) fs2.mkdirSync(dir);
        });

        // Create initial Excel file
        const excelFileName = `Result_${getTimeStamp()}.xlsx`;
        const excelPath = path.join(excelDir, excelFileName);
        
        const workbook = xlsx.utils.book_new();
        const headerRow = [['Image Name', 'Detected Product Description']];
        const worksheet = xlsx.utils.aoa_to_sheet(headerRow);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Results');
        xlsx.writeFile(workbook, excelPath);

        console.log(`Created Excel file: ${excelFileName}`);

        // Get image files
        const files = await fs.readdir(imagesDir);
        const imageFiles = files.filter(file => 
            ['.jpg', '.jpeg', '.png'].some(ext => file.toLowerCase().endsWith(ext))
        );

        if (imageFiles.length === 0) {
            console.log('No images found');
            return;
        }

        console.log(`Found ${imageFiles.length} images to process`);

        // Process queue with workers
        const queue = imageFiles.map(file => ({
            imagePath: path.join(imagesDir, file),
            imageName: file,
            excelPath
        }));

        const workers = new Set();
        const results = [];
        const allDescriptions = []; // Store all descriptions here

        while (queue.length > 0 || workers.size > 0) {
            while (workers.size < NUM_WORKERS && queue.length > 0) {
                const task = queue.shift();
                const worker = new Worker(path.join(__dirname, 'workers', 'detectProductDescriptionWorker.js'));

                worker.on('message', (result) => {
                    if (result.success) {
                        allDescriptions.push({
                            imageName: task.imageName,
                            description: result.description
                        });
                        console.log(`Processed ${task.imageName}`);
                    } else {
                        console.error(`Error processing ${task.imageName}: ${result.error}`);
                        allDescriptions.push({
                            imageName: task.imageName,
                            description: `ERROR: ${result.error}`
                        });
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

        // Write all results at once after processing completes
        const outputData = [['Image Name', 'Detected Product Description']];
        allDescriptions.forEach(item => {
            outputData.push([item.imageName, item.description]);
        });

        const outputWorksheet = xlsx.utils.aoa_to_sheet(outputData);
        const outputWorkbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(outputWorkbook, outputWorksheet, 'Results');
        xlsx.writeFile(outputWorkbook, excelPath);

        console.log('\nProcessing complete!');
        console.log(`Results saved to ${excelPath}`);

    } catch (error) {
        console.error('Error in productDescription:', error);
    }
}

module.exports = productDescription;