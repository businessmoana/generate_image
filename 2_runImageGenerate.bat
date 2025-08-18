@echo off
echo Running imageGenerate...
node -e "const { imageGenerate } = require('./index'); imageGenerate().then(() => process.exit());"
pause