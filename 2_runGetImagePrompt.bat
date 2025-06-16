@echo off
echo Running getImageGeneratePrompt...
node -e "const { getImageGeneratePrompt } = require('./index'); getImageGeneratePrompt().then(() => process.exit());"
pause