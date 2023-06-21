import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import { code } from 'telegraf/format'
import config from 'config'
import { ogg } from './ogg.js'

const bot = new Telegraf(config.get("TELEGRAM_TOKEN"))

bot.on(message('voice'), async (ctx) => {
    try {
      await ctx.reply(code('Сообщение принял. Жду ответ от сервера...'))
      const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
      const userId = String(ctx.message.from.id)
      const oggPath = await ogg.create(link.href, userId)
      const mp3Path = await ogg.toMp3(oggPath, userId)
    } catch (e) {
          console.log(`Error while voice message`, e.message)
    }
})

bot.command('start', async (ctx) => {
    await ctx.reply(JSON.stringify(ctx.message, null, 2))
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))