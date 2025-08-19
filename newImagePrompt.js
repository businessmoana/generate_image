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

const newImagePrompt = async () => {
    try {
        // Setup directories
        const excelDir = './excel_files';
        if (!fs2.existsSync(excelDir)) {
            fs2.mkdirSync(convertedDirMain);
        }

        // Create initial Excel file
        const excelFileName = `Result_${getTimeStamp()}.xlsx`;
        const excelPath = path.join(excelDir, excelFileName);
        
        const workbook = xlsx.utils.book_new();
        const headerRow = [['Image Name','ID', 'New Image Prompt']];
        const worksheet = xlsx.utils.aoa_to_sheet(headerRow);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Results');
        xlsx.writeFile(workbook, excelPath);

        console.log(`Created Excel file: ${excelFileName}`);

        const exportedFile = await fs.readdir('./exported_file');
        const latestExportedFile = exportedFile
            .filter(file => file.endsWith('.xlsx'))
            .sort()
            .pop();

        if (!latestExportedFile) {
            console.error('No Excel file found');
            return;
        }

        const exportedPath = path.join('./exported_file', latestExportedFile);
        const exportedFileWorkbook = xlsx.readFile(exportedPath);
        const exportedFileWorksheet = exportedFileWorkbook.Sheets[exportedFileWorkbook.SheetNames[0]];
        const exportedData = xlsx.utils.sheet_to_json(exportedFileWorksheet);

        
        const imageData = exportedData.map(row => ({
            imageName: row['post_title'],
            imagePath: row['images'],
            id: row['ID'],
        }));

        const queue = imageData.filter(data => 
            data.imageName && data.imagePath && data.id
        ).map(data => ({
            imageName: data.imageName,
            imagePath: data.imagePath,
            id: data.id,
            excelPath
        }));

        const workers = new Set();
        const results = [];
        const allNewImagePrompt = []; // Store all descriptions here

        while (queue.length > 0 || workers.size > 0) {
            while (workers.size < NUM_WORKERS && queue.length > 0) {
                const task = queue.shift();
                const worker = new Worker(path.join(__dirname, 'workers', 'newImagePrompt.js'));

                worker.on('message', (result) => {
                    if (result.success) {
                        allNewImagePrompt.push({
                            imageName: task.imageName,
                            id: task.id,
                            newImagePrompt: result.newImagePrompt
                        });
                        console.log(`Processed ${task.imageName}`);
                    } else {
                        console.error(`Error processing ${task.imageName}: ${result.error}`);
                        allNewImagePrompt.push({
                            imageName: task.imageName,
                            id: task.id,
                            newImagePrompt: `ERROR: ${result.error}`
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
        const outputData = [['Image Name','ID', 'New Image Prompt']];
        allNewImagePrompt.forEach(item => {
            outputData.push([item.imageName, item.id, item.newImagePrompt]);
        });

        const outputWorksheet = xlsx.utils.aoa_to_sheet(outputData);
        const outputWorkbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(outputWorkbook, outputWorksheet, 'Results');
        xlsx.writeFile(outputWorkbook, excelPath);

        console.log('\nProcessing complete!');
        console.log(`Results saved to ${excelPath}`);

    } catch (error) {
        console.error('Error in newImagePrompt:', error);
    }
}

module.exports = newImagePrompt;