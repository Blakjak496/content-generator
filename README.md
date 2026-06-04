# Content Generator
An automated content generation script that runs on a scheduled basis, queries the Anthropic API with web search enabled, and delivers a structured package of AI-generated content documents via email.
What it does
On each run the script:

Sends a system prompt and contextual user prompt to the Anthropic API
Uses real-time web search to inform the generated content
Splits the response into separate Word documents based on configurable section markers
Attaches the documents to an email and delivers them via Resend

## Stack

Node.js
Anthropic SDK
Resend (transactional email)
docx (Word document generation)

## Project structure
```
content-generator/
├── run.js          # Entry point — handles API call and state management
├── deliver.js      # Output module — builds documents and sends email
├── config.json     # Persistent state and output configuration (not included)
├── prompt.txt      # System prompt passed to the API on every run (not included)
├── .env            # Environment variables and credentials (not included)
└── run.log         # Append-only run log (generated on first run)
```

## Setup
### 1. Install dependencies
```
npm install
```
### 2. Create a .env file
```
ANTHROPIC_API_KEY=your_key_here
RESEND_API_KEY=your_key_here
EMAIL_SENDER=Your Name <you@yourdomain.com>
EMAIL_RECIPIENT=recipient@theirdomain.com
EMAIL_SUBJECT=Your Subject Line
```

### 3. Create a config.json file
```
{
  "articleCounter": number,
  "lastRun": string || null, (iso date string)
  "newFileMarker": string,
  "sectionHeadings": string[]
}
```
newFileMarker defines the label the script uses to split the API response into separate documents. sectionHeadings defines which lines are rendered as subheadings within each document. Both should match the output format defined in your system prompt.

### 4. Create a prompt.txt file
Add your system prompt. The output format should use the markers defined in config.json so the script can correctly split and structure the documents.

### 5. Run manually
```
node run.js
```
### 6. Schedule
The script is stateless between runs aside from config.json. It can be scheduled using cron or any equivalent task scheduler. The contentCounter increments by the number of documents produced per run and is only written back on a successful run, so a failed run does not advance the counter.

## State management
config.json is read at the start of each run and written back on success. A failed run leaves the file unchanged so the next run retries with the same counter values.
run.log records a timestamped line on every run, successful or failed, for basic operational visibility.

## Output
Each run produces one .docx file per section, named YYYY-MM-DD-Content1.docx etc., attached to a single email. The email body confirms the date and number of files attached.
