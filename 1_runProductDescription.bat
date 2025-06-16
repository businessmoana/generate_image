@echo off
echo Running productDescription...
node -e "const { productDescription } = require('./index'); productDescription().then(() => process.exit());"
pause