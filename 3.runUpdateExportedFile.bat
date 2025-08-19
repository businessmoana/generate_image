@echo off
echo Running updateLatestExcelImages...
node -e "const { updateLatestExcelImages } = require('./index'); updateLatestExcelImages().then(() => process.exit());"
pause