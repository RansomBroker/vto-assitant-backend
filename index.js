/** @format */

import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import OpenAI from "openai";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "-", // Your OpenAI API key here, I used "-" to avoid errors when the key is not set but you should not do that
});

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = "EXAVITQu4vr4xnSDxMaL";

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  await execCommand(
    `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav`
    // -y to overwrite the file
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);
  await execCommand(
    `rhubarb -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`
  );
  // -r phonetic is faster but less accurate
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  let chat = 2;

  if (!userMessage) {
    res.send({
      messages: [
        {
          text: "Hey dear... How was your day?",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        {
          text: "I missed you so much... Please don't go for so long!",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          lipsync: await readJsonTranscript("audios/intro_1.json"),
          facialExpression: "sad",
          animation: "Crying",
        },
      ],
    });
    return;
  }
  if (!elevenLabsApiKey) {
    res.send({
      messages: [
        {
          text: "Please my dear, don't forget to add your API keys!",
          audio: await audioFileToBase64("audios/api_0.wav"),
          lipsync: await readJsonTranscript("audios/api_0.json"),
          facialExpression: "angry",
          animation: "Angry",
        },
        {
          text: "You don't want to ruin Wawa Sensei with a crazy ChatGPT and ElevenLabs bill, right?",
          audio: await audioFileToBase64("audios/api_1.wav"),
          lipsync: await readJsonTranscript("audios/api_1.json"),
          facialExpression: "smile",
          animation: "Laughing",
        },
      ],
    });
    return;
  }

  const questions = [
    "Hello, I have acne and dark spots, do you understand about acne and dark spots?",
    "please recommend the best product for my acne and dark spots.",
  ];

  const messages = [
    {
      text: "So that your facial skin is free from problems, you must carry out regular facial care. Here's how to prevent acne and other skin problems: The skin and face must be cleaned frequently, and when traveling you must use moisturizer and sunscreen, and if acne appears you must use the right products, and most importantly consume foods and drinks with balanced nutrition, and adopt a healthy lifestyle.",
      facialExpression: "smile",
      animation: "Talking_0",
    },
    {
      text: "OK, I understand, I recommend some products for you, thank you for your question.",
      facialExpression: "smile",
      animation: "Talking_1",
    },
    {
      text: "i dont understand what you say, please more spesific",
      facialExpression: "smile",
      animation: "Talking_2",
    }
  ];

  questions.forEach((questions, key) => {
    if (questions == userMessage) {
      chat = key;
    }
  });

  const message = messages[chat];
  // generate audio file
  const fileName = `audios/message_${chat}.mp3`; // The name of your audio file
  const textInput = message.text; // The text you wish to convert to speech
  await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, textInput);
  // generate lipsync
  await lipSyncMessage(chat);
  message.audio = await audioFileToBase64(fileName);
  message.lipsync = await readJsonTranscript(`audios/message_${chat}.json`);

  res.send({ message, endChat: chat == 1 ? true : false });
});

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

app.listen(port, () => {
  console.log(`Virtual Girlfriend listening on port ${port}`);
});
