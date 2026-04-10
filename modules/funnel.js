/**
 * @module Funnel
 * @description Логика воронки "Автор Своей Сказки" на базе МАК-карт и символдрамы.
 */

const { Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const schedule = require("node-schedule");
const utils = require("./utils");
const kb = require("./keyboards");
const payments = require('./payments');
const storage = require('./storage');

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
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // --- ШАГ 1: ВЫБОР ЛОКАЦИИ ---
    bot.action("funnel_gift", async (ctx) => {
      await ctx.answerCbQuery();
      const data = funnel.getData();
      const text =
        "✨ <b>Путешествие начнется с создания карты Пути твоего Героя</b>\n\nНапример,\n\n выбери номер локации на изображении, которая притягивает твой взгляд прямо сейчас:";
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

      const text = `<b>Представь себя в этом месте</b>\n\nЧто ты чувствуешь?\n\nТы хочешь находиться здесь?\n\n✨ <b>Кто-то ждет тебя здесь...</b>Представь Доброго Мудрого Хранителя этого места. Это:`;
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("👴 Мудрый(ая) наставник(ца)", "guide_old")],
        [Markup.button.callback("🐆 Тотемное Жживотное", "guide_animal")],
        [Markup.button.callback("✨ Сияющий Свет", "guide_light")],
      ]);
      await ctx.sendPhoto(data.images.loc_cards[loc.id], {
        caption: text,
        parse_mode: "HTML",
        ...keyboard,
      });
    });

    bot.action(/^guide_(.+)$/, async (ctx) => {
      try {
        await ctx.answerCbQuery();
        const data = funnel.getData();

        // Сразу подтверждаем выбор коротким текстом
        await ctx.reply("✨ Твой Хранитель слышит тебя...");

        await delay(1500);

        // Через 3 секунды присылаем глубокое напутствие с кнопкой
        const wisdomText = `✨ <b>Подробно представь Хранителя еще раз...</b>\n\nНаполни его мудростью и силой. Представь, что он делится с тобой этой энергией. Что он говорит? Какой совет он тебе дает прямо сейчас? Наполнись его силой, стань лучшей версией себя. Это состояние — твой компас.\n\n На курсе мы тщательно проработаем твои сильные стороны и поймем как правильно их применять....`;
        
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback("✨ Я чувствую эту силу", "show_shadow_cards")]
        ]);

        await ctx.reply(wisdomText, {
          parse_mode: "HTML",
          ...keyboard,
        });
      } catch (e) {
        console.error("Ошибка в шаге Guide:", e);
      }
    });

    // --- ШАГ 3: ТЕНЬ (ПРЕГРАДА) ---
    bot.action("show_shadow_cards", async (ctx) => {
      await ctx.answerCbQuery();
      const data = funnel.getData();

      const text = "Хранитель дал тебе силу. Но дорогу преграждает <b>Тень старого сценария</b>. Выбери номер на изображении, который в большей степени мешает тебе следовать мудрости Хранителя:";
      
      await ctx.sendPhoto(data.images.all_shd_sheet, {
        caption: text,
        parse_mode: "HTML",
        ...kb.makeGrid("shd", 9), 
      });
    });

    bot.action(/^shd_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const data = funnel.getData();
      const shd = data.content.shadows[ctx.match[1]];

      const intro = `<b>Ты встречаешь Дракона препятствия...</b>\nЧто говорит этот Дракон?\n Почему он мешает?\n\n🧘 <b>Практика:</b> Встряхнись, потопай ногами, посмотри вокруг и войди в роль Наблюдателя нашего сюжета. Какой развязки ты хочешь на самом деле? Проживи её в мыслях...`;
      
      await ctx.sendPhoto(data.images.shadow_cards[ctx.match[1]], {
        caption: intro,
        parse_mode: "HTML",
      });

      await delay(3000); 

      const deepenText = `✨ <b>Вернись в ситуацию</b> и подробно проживи её так, как ты только что придумал(а)... Наблюдай за изменениями в теле.`;
      
      // Добавляем кнопку для перехода к следующему шагу
      const nextButton = Markup.inlineKeyboard([
        [Markup.button.callback("✨ Продолжить", "continue_to_course")]
      ]);
      
      await ctx.reply(deepenText, { 
        parse_mode: "HTML", 
        ...nextButton 
      }).catch(() => {});

      // Обработчик для кнопки продолжения
      bot.action("continue_to_course", async (ctx) => {
        await ctx.answerCbQuery();
        
        await delay(2000);

        const deepText = `👴 <b>На курсе мы подробно разберемся</b> со всеми препятствиями, заберем у них силы или сделаем своими союзниками`;
        await ctx.replyWithPhoto(data.images.start_welcome || data.images.reminder, {
          caption: deepText,
           parse_mode: "HTML" }).catch(() => {});

        await delay(5000);

        // Интеграция с картинкой и кнопкой
        const integrationText = `✨ <b>Интеграция</b>\nПрямо сейчас ответь на вопрос:\n\nКак уже сейчас ты можешь начать применять этот опыт в своей жизни?`;
        
        // Добавляем кнопку "Я нашла ответ"
        const integrationButton = Markup.inlineKeyboard([
          [Markup.button.callback("✅ Я нашла ответ", "integration_complete")]
        ]);
        
        await ctx.reply(integrationText, {
          parse_mode: "HTML",
          ...integrationButton
        }).catch(() => {});

        // Обработчик для завершения интеграции
        bot.action("integration_complete", async (ctx) => {
          await ctx.answerCbQuery();
          
          await delay(2000);

          const finaltext = `✨ <b>Практика завершена.</b>\nВ конце курса мы перенесем всю магию сказки в реальную жизнь: составим пошаговый план действий для осуществления твоих целей`;
          await ctx.reply(finaltext, { parse_mode: "HTML" }).catch(() => {});

          await delay(2000);

          const text = `✨ <b>Забирай PDF с мини-практикой</b> «Режиссерская версия» с объяснениями, чтобы этот инструмент всегда был с тобой.`;
          const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback("📑 Скачать практику (PDF)", "download_practice")],
            [Markup.button.callback("🚀 Идти к финалу", "show_offer")],
          ]);
          await ctx.reply(text, { parse_mode: "HTML", ...keyboard }).catch(() => {});
        });
      });
    });

    // --- ШАГ 4.1: СКАЧИВАНИЕ + МОСТИК ---
    bot.action("download_practice", async (ctx) => {
      await ctx.answerCbQuery();
      const data = funnel.getData();
      await utils.sendPDF(
        ctx,
        data.pdf_id,
        "Твой личный свиток трансформации. ✨",
      );

      await delay(5000);
      const text = `🧘 <b>Помни, твой Хранитель всегда с тобой...</b>\n Готов(а) открыть врата и узнать условия Путешествия?`;
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("🚀 Открыть врата", "show_offer")],
      ]);
      await ctx.telegram.sendPhoto(ctx.from.id, data.images.reminder, {
        caption: text,
        parse_mode: "HTML",
        ...keyboard,
      });
    });

    // --- ШАГ 5: ОФФЕР ---
    bot.action("show_offer", async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const data = funnel.getData();
      const p = data.prices;

      const fullPrice = p.list.find((item) => item.id === "full")?.price || "";
      const specialPrice = p.list.find((item) => item.id === "special")?.price || "";

      const text =
        `✨ <b>Курс-путешествие "Архитектор своей Истории"</b>\n\n` +
        `🏆 <b>Спеццена: ${specialPrice}</b> (вместо ${fullPrice}) - действительна в течении суток\n` +
        `⏳ Забронируй место всего за <b>${p.reserve}</b>!`;

      const keyboard = kb.offerMenu(p.reserve);

      try {
        await ctx.editMessageCaption(text, { parse_mode: "HTML", ...keyboard });
      } catch (e) {
        await ctx.sendPhoto(data.images.offer_main, {
          caption: text,
          parse_mode: "HTML",
          ...keyboard,
        });
      }
    });

    // --- ШАГ 5.1: ДЕТАЛЬНЫЕ ЦЕНЫ ---
    bot.action("show_prices", async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const data = funnel.getData();
      const p = data.prices;

      const priceRows = p.list
        .map((item) => `🔹 <b>${item.name}</b> — <b>${item.price}</b>\n<i>${item.desc}</i>`)
        .join("\n\n");

      const fullText =
        `📜 <b>Стоимость и форматы участия:</b>\n\n${priceRows}\n\n` +
        `✨ <i>Выбирай свой формат и нажимай кнопку ниже:</i>`;

      await ctx.editMessageCaption(fullText, {
        parse_mode: "HTML",
        ...kb.pricesMenu(p.pay_url),
      }).catch(() => {});
    });

    // --- ОБРАБОТЧИКИ ОПЛАТЫ ---
    bot.action("reserve_price", async (ctx) => {
      await payments.handleReservePrice(ctx);
    });

    bot.action("confirm_payment", async (ctx) => {
      await payments.handleFullPayment(ctx);
    });

    // Новый обработчик для перехода к отправке чека
    bot.action("i_paid", async (ctx) => {
      await ctx.answerCbQuery();
      
      const userId = ctx.from.id;
      
      // Устанавливаем флаг ожидания чека через storage
      await storage.updateUserSetting(userId, { 
        awaitingReceipt: true,
        paymentStep: 'waiting_receipt'
      });
      
      await ctx.reply("📸 Пожалуйста, пришлите скриншот чека или фотографию документа об оплате:");
    });

    // --- СВЯЗЬ С АДМИНОМ ---
    bot.action("contact_admin", async (ctx) => {
      await ctx.answerCbQuery();
      const data = funnel.getData();
      await ctx.reply(`По всем вопросам пиши сюда ${data.admin_username}`);
    });
  },
};

module.exports = funnel;