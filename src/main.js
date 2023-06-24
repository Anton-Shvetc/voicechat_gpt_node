import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import { code } from 'telegraf/format'
import config from 'config'
import { ogg } from './ogg.js'
import { openai } from "./openai.js";

const bot = new Telegraf(config.get("TELEGRAM_TOKEN"))
export const INITIAL_SESSION = {
  messages: [],
};
export async function initCommand(ctx) {
  ctx.session = INITIAL_SESSION;
  await ctx.reply("Жду вашего голосового или текстового сообщения");
}
export async function processTextToChat(ctx, content) {
  try {
    // пушим сообщения пользователя в сессию (в контекст)
    ctx.session.messages.push({ role: openai.roles.USER, content });
    // пушим сообщения бота в сессию (в контекст)
    const response = await openai.chat(ctx.session.messages);
    ctx.session.messages.push({
      role: openai.roles.ASSISTANT,
      content: response.content,
    });
    await ctx.reply(response.content);
  } catch (e) {
    console.log("Error while proccesing text to gpt", e.message);
  }
}
bot.on(message("text"), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  try {
    await ctx.reply(code("Сообщение принял. Жду ответ от сервера..."));
    await processTextToChat(ctx, ctx.message.text);
  } catch (e) {
    console.log(`Error while voice message`, e.message);
  }
});

bot.on(message("voice"), async (ctx) => {
  try {
    await ctx.reply(code("Сообщение принял. Жду ответ от сервера..."));
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userId = String(ctx.message.from.id);
    const oggPath = await ogg.create(link.href, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);
    //removeFile(oggPath);
    const text = await openai.transcription(mp3Path);
    const messages = [{ role: openai.roles.USER, content: text }];
    const response = await openai.chat(messages);
    await ctx.reply(response.content);
  } catch (e) {
    console.error(`Error while proccessing voice message`, e.message);
  }
});


// bot.on(message("photo"), async (ctx) => {
//   try {
//     await ctx.reply(code("Фото принял. Отправляю на обработку..."));
//     const file_id = ctx.message.photo[0].file_id;
//     const link = await ctx.telegram.getFileLink(file_id);
//     const userId = String(ctx.message.from.id);
//     const imageFeatures = await googleVision.detectText(link.href);

//     const messages = [{ role: openai.roles.USER, content: imageFeatures }];
//     const response = await openai.chat(messages);
//     await ctx.reply(response.content);
//   } catch (e) {
//     console.error(`Error while proccessing photo message`, e.message);
//   }
// });

bot.command('start', async (ctx) => {
    await ctx.reply(JSON.stringify(ctx.message, null, 2))
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))