import Anthropic from '@anthropic-ai/sdk';
import {readFileSync, writeFileSync, appendFileSync } from 'fs';
import { deliver } from './deliver.js';
import 'dotenv/config';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY});

const SYSTEM_PROMPT = readFileSync("prompt.txt", "utf8");

const config = JSON.parse(readFileSync("config.json", 'utf8'));
const startingCode = config.contentCounter;
const runDate = new Date().toISOString();

const userPrompt = `
Today's date is ${runDate}.
  The last run was ${config.lastRun ?? "unknown — this may be the first run"}.
  Search for stories published since the last run.
  The content codes for this run are STO${startingCode}, STO${startingCode + 1}, STO${startingCode + 2}.
`

try {
    const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    tools: [{ type: 'web_search_20250305', name: 'web_search'}],
    system: SYSTEM_PROMPT,
    messages: [{role: 'user', content: userPrompt}]
});

const content = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');

await deliver(content, runDate);

writeFileSync('config.json', JSON.stringify({
    ...config,
    contentCounter: config.contentCounter + 3,
    lastRun: runDate
}, null, 2));

appendFileSync('run.log', `[${runDate}] Run complete. Codes STO${startingCode}-STO${startingCode + 2}\n`);

console.log("Run Complete");
}

catch(err) {
 appendFileSync("run.log", `[${runDate}] Run failed: ${err.message}\n`);
  console.error("Run failed:", err.message);
  process.exit(1);
}