@echo off
echo Running updateLatestExcelImages...
node -e "const { updateLatestExcelImages } = require('./index'); updateLatestExcelImages().then(() => { console.log('Update complete.'); process.exit(); }).catch(err => { console.error('Error:', err); process.exit(1); });"
pause