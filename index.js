require('dotenv').config();
const express = require('express');
const newImagePrompt = require('./newImagePrompt');
const imageGenerate = require('./imageGenerate');

const app = express();
app.use(express.json());
const PORT = 3000;

// Export functions for batch file access
module.exports = {
  startServer,
  newImagePrompt,
  imageGenerate
};

async function startServer() {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

// If run directly (node index.js), start the server
if (require.main === module) {
  startServer();
}