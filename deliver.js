import "dotenv/config";
import { readFileSync } from "fs";
import { Resend } from "resend";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

const resend = new Resend(process.env.RESEND_API_KEY);

const config = JSON.parse(readFileSync("config.json", "utf8"));
const storyRegex = new RegExp(`^${config.newFileMarker} \\d`);
const headingRegex = new RegExp(`^(${config.sectionHeadings.join("|")})$`);

function splitIntoStories(content) {
  const stories = [];
  const parts = content.split(new RegExp(`(?=${config.newFileMarker} \\d)`));
  for (const part of parts) {
    if (part.trim().startsWith(config.newFileMarker)) {
      stories.push(part.trim());
    }
  }
  return stories;
}

function buildDocument(storyContent) {
  const lines = storyContent.split("\n");

  const children = lines.map(line => {
    if (storyRegex.test(line)) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(line)]
      });
    }
    if (headingRegex.test(line.trim())) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(line)]
      });
    }
    if (line.trim() === "") {
      return new Paragraph({});
    }
    return new Paragraph({
      children: [new TextRun(line)]
    });
  });

  return new Document({
    sections: [{ children }]
  });
}

export async function deliver(content, runDate) {
  const date = new Date(runDate).toISOString().split("T")[0];
  const stories = splitIntoStories(content);

  const attachments = await Promise.all(
    stories.map(async (story, i) => {
      const doc = buildDocument(story);
      const buffer = await Packer.toBuffer(doc);
      return {
        filename: `${date}-Story${i + 1}.docx`,
        content: buffer.toString("base64")
      };
    })
  );

  await resend.emails.send({
    from: process.env.EMAIL_SENDER,
    to: process.env.EMAIL_RECIPIENT,
    subject: `${process.env.EMAIL_SUBJECT} - ${date}`,
    text: `Content package for ${date}. ${attachments.length} files attached.`,
    attachments
  });
}