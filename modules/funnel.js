/**
 * @module Funnel
 * @description Логика воронки "Автор Своей Сказки" на базе МАК-карт и символдрамы.
 */

const { Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const schedule = require("node-schedule");
const utils = require("./utils"); // Твой модуль с sendPDF и trackFileIds
const kb = require("./utils/keyboards"); // Модуль для генерации сеток кнопок

const funnel = {
  configPath: path.join(process.cwd(), "data", "funnel_config.json"),

  /** Загрузка данных из JSON */
  getData: () => {
    try {
      return JSON.parse(fs.readFileSync(funnel.configPath, "utf8"));
    } catch (e) {
      console.error("Ошибка конфига:", e.message);
      return { images: {}, content: {}, prices: {} };
    }
  },

  /** Напоминание через 20 часов */
  scheduleReminder: (ctx) => {
    const userId = ctx.from.id;
    const fireDate = new Date(Date.now() + 20 * 60 * 60 * 1000);

    const existingJob = schedule.scheduledJobs[`reminder_${userId}`];
    if (existingJob) existingJob.cancel();

    schedule.scheduleJob(`reminder_${userId}`, fireDate, async () => {
      const data = funnel.getData();
      const text = `🌑 <b>Твой Хранитель ждет у врат...</b>\n\nСпеццена на Путешествие (<b>${data.prices.special}</b>) скоро сгорит. Готов(а) стать Автором своей жизни?`;
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.url("🔥 Сохранить спеццену", "https://pay.ru")],
      ]);

      await ctx.telegram
        .sendPhoto(userId, data.images.reminder, {
          caption: text,
          parse_mode: "HTML",
          ...keyboard,
        })
        .catch(() => {});
    });
  },
  /**
   * Отменяет запланированное напоминание для пользователя.
   * Вызывается при оплате или бронировании.
   * @param {number|string} userId - ID пользователя Telegram.
   */
  stopReminder: (userId) => {
    const job = schedule.scheduledJobs[`reminder_${userId}`];
    if (job) {
      job.cancel();
      console.log(`[Scheduler] Напоминание для ${userId} отменено.`);
    }
  },

  init: (bot) => {
    // --- СТАРТ / RE-ENGAGEMENT ---
    bot.start(async (ctx) => {
      const data = funnel.getData();
      if (ctx.startPayload === "pay")
        return bot.handleAction("show_offer", ctx); // Deep Link

      const text = `✨ <b>Приветствую, Странник!</b>\n\nТы на пороге своей новой истории. Как начнем путь?`;
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("🔮 Пройти диагностику", "funnel_gift")],
        [Markup.button.callback("🚀 Записаться / Оплатить", "show_offer")],
        [Markup.button.callback("📖 Программа", "show_program")],
      ]);
      await ctx.sendPhoto(data.images.start_welcome, {
        caption: text,
        parse_mode: "HTML",
        ...keyboard,
      });
    });

    // --- ШАГ 1: ВЫБОР ЛОКАЦИИ ---
    bot.action("funnel_gift", async (ctx) => {
      await ctx.answerCbQuery();
      const data = funnel.getData();
      const text =
        "✨ <b>Твой путь начинается...</b>\n\nВыбери номер карты, которая притягивает твой взгляд прямо сейчас:";
      await ctx.sendPhoto(data.images.all_loc_sheet, {
        caption: text,
        parse_mode: "HTML",
        ...kb.makeGrid("loc", 9),
      });
    });

    // --- ШАГ 2: ИНТЕРПРЕТАЦИЯ + ХРАНИТЕЛЬ ---
    bot.action(/^loc_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const data = funnel.getData();
      const loc = data.content.locations[ctx.match[1]];

      const text = `<b>Выбрана локация: ${loc.name}</b>\n\nЭтот образ ${loc.desc}\n\n✨ <b>Кто ждет тебя там?</b> Выбери своего Хранителя:`;
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("👴 Мудрый Старец", "guide_old")],
        [Markup.button.callback("🐆 Тотемное Животное", "guide_animal")],
        [Markup.button.callback("✨ Сияющий Свет", "guide_light")],
      ]);
      await ctx.sendPhoto(data.images.loc_cards[loc.id], {
        caption: text,
        parse_mode: "HTML",
        ...keyboard,
      });
    });

    // --- ШАГ 3: ТЕНЬ (ПРЕГРАДА) ---
    bot.action(/^guide_(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const data = funnel.getData();
      const text =
        "Хранитель дает тебе силу. Но дорогу преграждает <b>Тень старого сценария</b>. Выбери самую «тяжелую» карту:";
      await ctx.sendPhoto(data.images.all_shd_sheet, {
        caption: text,
        parse_mode: "HTML",
        ...kb.makeGrid("shd", 9),
      });
    });

    // --- ШАГ 4: ТЕНЬ + ПРАКТИКА (ПАУЗА 5 СЕК) ---
    bot.action(/^shd_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const data = funnel.getData();
      const shd = data.content.shadows[ctx.match[1]];

      const intro = `<b>Тень: ${shd.title}.</b>\nЭто ${shd.trauma}.\n\n🧘 <b>Практика:</b> Выйди в роль Наблюдателя. Какой развязки ты хочешь на самом деле? Проживи её в мыслях...`;
      await ctx.sendPhoto(data.images.shadow_cards[ctx.match[1]], {
        caption: intro,
        parse_mode: "HTML",
      });

      setTimeout(async () => {
        const text = `✨ <b>Практика завершена.</b>\nЗабирай PDF-инструкцию «Глазами Наблюдателя», чтобы этот инструмент всегда был с тобой.`;
        const keyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "📑 Скачать практику (PDF)",
              "download_practice",
            ),
          ],
          [Markup.button.callback("🚀 Идти к финалу", "show_offer")],
        ]);
        await ctx.reply(text, { parse_mode: "HTML", ...keyboard });
      }, 5000);
    });

    // --- ШАГ 4.1: СКАЧИВАНИЕ + МОСТИК (ПАУЗА 7 СЕК) ---
    bot.action("download_practice", async (ctx) => {
      await ctx.answerCbQuery();
      const data = funnel.getData();
      await utils.sendPDF(
        ctx,
        data.pdf_id,
        "Твой личный свиток трансформации. ✨",
      );

      setTimeout(async () => {
        const text = `🧘 <b>Твой Хранитель уже у последних врат...</b>\nЭто была лишь одна глава. Готов(а) открыть врата и узнать условия Путешествия?`;
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback("🚀 Открыть врата", "show_offer")],
        ]);
        await ctx.telegram.sendPhoto(ctx.from.id, data.images.reminder, {
          caption: text,
          parse_mode: "HTML",
          ...keyboard,
        });
      }, 7000);
    });

    // --- ШАГ 5: ОФФЕР И ЦЕНЫ ---
    bot.action("show_offer", async (ctx) => {
      await ctx.answerCbQuery();
      const data = funnel.getData();
      funnel.scheduleReminder(ctx);

      const text = `🗺 <b>Курс-путешестие "Архитектор своего сценария"</b>\n\n🏆 <b>Весь путь: ${data.prices.special}</b> (вместо ${data.prices.full})\n⏳ Забронируй скидку за ${data.prices.reserve}!`;
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.url(
            `🔥 Забронировать (${data.prices.reserve})`,
            "https://pay.ru",
          ),
        ],
        [Markup.button.callback("✅ Я оплатил(а)", "confirm_payment")],
        [Markup.button.callback("📖 Отзывы", "show_reviews")],
        [Markup.button.callback("💬 Связаться", "contact_admin")],
      ]);
      await ctx.sendPhoto(data.images.offer_main, {
        caption: text,
        parse_mode: "HTML",
        ...keyboard,
      });
    });
/**
 * ОБРАБОТЧИК ПОДТВЕРЖДЕНИЯ ОПЛАТЫ
 */
bot.action("confirm_payment", async (ctx) => {
    await ctx.answerCbQuery();
    const data = funnel.getData();

    // Вызываем вынесенную логику
    await utils.handlePaymentConfirmation(ctx, data);
});
    // --- СВЯЗЬ С АДМИНОМ ---
    bot.action("contact_admin", async (ctx) => {
      await ctx.answerCbQuery();
      const data = funnel.getData();
      await ctx.reply(`По всем вопросам пиши мастеру: @${data.admin_username}`);
    });

  },
};

module.exports = funnel;
