import "dotenv/config";
import { Resend } from "resend";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

const resend = new Resend(process.env.RESEND_API_KEY);

function splitIntoStories(content) {
  const stories = [];
  const parts = content.split(/(?=STORY \d)/);
  for (const part of parts) {
    if (part.trim().startsWith("STORY")) {
      stories.push(part.trim());
    }
  }
  return stories;
}

function buildDocument(storyContent) {
  const lines = storyContent.split("\n");

  const children = lines.map(line => {
    if (line.match(/^STORY \d/)) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(line)]
      });
    }
    if (line.match(/^(Headline|Subdeck|Article|Newsletter Summary|LinkedIn Post)$/)) {
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
        filename: `SJ-Content-${date}-Story${i + 1}.docx`,
        content: buffer.toString("base64")
      };
    })
  );

  await resend.emails.send({
    from: process.env.EMAIL_SENDER,
    to: process.env.EMAIL_RECIPIENT,
    subject: `${process.env.EMAIL_SUBJECT} - ${date}`,
    text: `Stone Junction content package for ${date}. ${attachments.length} stories attached.`,
    attachments
  });
}