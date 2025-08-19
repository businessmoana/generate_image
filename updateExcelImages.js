const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const EXPORT_DIR = path.join(__dirname, 'exported_file');
const RESULT_DIR = path.join(__dirname, 'result');

function getLatestExcelFile(directory) {
  const files = fs.readdirSync(directory)
    .filter(f => f.endsWith('.xlsx'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(directory, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) throw new Error('No Excel files found.');
  return path.join(directory, files[0].name);
}

function extractBaseUrl(imageUrl) {
  const lastSlash = imageUrl.lastIndexOf('/');
  if (lastSlash === -1) return '';
  return imageUrl.substring(0, lastSlash + 1);
}

function formatImageUrl(baseUrl, postTitle) {
  return baseUrl + postTitle.toLowerCase().replace(/ /g, '_') + '.png';
}

function updateImagesColumnAndSaveNew(filePath, resultDir) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  if (!data[0] || !('post_title' in data[0]) || !('images' in data[0])) {
    throw new Error('Required columns not found.');
  }

  const baseUrl = extractBaseUrl(data[0].images);

  data.forEach(row => {
    row.images = formatImageUrl(baseUrl, row.post_title);
  });

  const newSheet = XLSX.utils.json_to_sheet(data);
  workbook.Sheets[sheetName] = newSheet;

  if (!fs.existsSync(resultDir)) {
    fs.mkdirSync(resultDir, { recursive: true });
  }

  const newFilePath = path.join(resultDir, path.basename(filePath));
  XLSX.writeFile(workbook, newFilePath);
  console.log(`Updated images column and saved to ${newFilePath}`);
}

const updateLatestExcelImages = () => {
  const latestFile = getLatestExcelFile(EXPORT_DIR);
  updateImagesColumnAndSaveNew(latestFile, RESULT_DIR);
}

module.exports = updateLatestExcelImages;