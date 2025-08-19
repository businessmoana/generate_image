@echo off
echo Running updateLatestExcelImages...
node -e "const updateLatestExcelImages = require('./updateExcelImages'); updateLatestExcelImages(); console.log('Update complete.');"
pause