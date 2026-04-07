const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'store', 'supabaseStore.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Insert the logger import after the existing imports
if (!content.includes("import { logger } from")) {
    content = content.replace(/(import .*;\n)+/, "$&\nimport { logger } from '@/utils/logger';\n");
}

// Replace console.log, console.warn, console.error
content = content.replace(/console\.log/g, 'logger.log');
content = content.replace(/console\.warn/g, 'logger.warn');
content = content.replace(/console\.error/g, 'logger.error');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced console with logger in supabaseStore.ts');
