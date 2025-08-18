@echo off
echo Running for get new image prompt...
node -e "const { newImagePrompt } = require('./index'); newImagePrompt().then(() => process.exit());"
pause