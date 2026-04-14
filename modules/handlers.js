/**
 * @module Handlers
 * @description Основной контроллер навигации. Обрабатывает нажатия кнопок Reply-меню и переключает экраны.
 */
const { Markup } = require('telegraf');
const storage = require("./storage");
const config = require("./config");
const menus = require("./menus");
const { sendMapPathSession } = require('./mapPath');

/**
 * Маршрутизатор текстовых сообщений.
 * @async
 * @param {Object} ctx - Контекст сообщения Telegraf.
 * @param {Object} userSettings - Общий объект настроек всех пользователей.
 * @param {Object} userHistory - История сообщений (добавили параметр).
 * @returns {Promise<boolean>} Возвращает true, если кнопка обработана, иначе false (для передачи сообщения в ИИ).
 */
module.exports = async (ctx, userSettings, userHistory) => {
  const text = ctx.message.text;
  const userId = ctx.from.id;
  const settings = userSettings[userId];
    const isAdmin = String(userId) === String(config.ADMIN_ID);
     const userCount = storage.getUserCount(); // Считаем ID в базе
     console.log(` Всего пользователей: ${storage.getUserCount()}`);

  // Если настроек нет (защита от ошибок), выходим
  if (!settings) return false;

 // Очистка состояния чекапа при переходе в другие разделы
  const stopAstroButtons = ['🔮 Узнать свой Путь (Чекап)',
    '🎭 Мои Услуги', 
    '✍️ Задать вопрос',
    '❓ Справка',
    '⚙️ Админ-панель',
    '✨ Самопознание и Сказки',
    '💻 IT-разработка (Боты/Сайты)',
    '⬅️ В главное меню',
    '📈 Карта Пути (Сессия)',
    '✨ Курс-Путешествие',
    '🔮 Повторить Чекап',
    '⬅️ Назад в услуги',
    '🤖 Создание ботов',
    '⚙️ Web-разработка',
    '⬅️ Назад в админку',
    '📢 Рассылка',
    '🤖 Настройки ИИ',
    '✅ Поиск: ВКЛ',
    '🌍 Поиск: ВЫКЛ',
    '✅ Кратко',
    '⚡️ Кратко',
    '🤖 Сменить модель',
    '🧹 Очистить контекст',
    '⬅️ Назад',
    '✅ Отправить всем',
    '❌ Отмена'];
  if (stopAstroButtons.includes(text)) {
      settings.isAstroCheck = false;
      settings.awaitingReceipt = false;
      settings.paymentStep = null;
  }

  // В начале handlers.js проверь, не начинается ли текст с названия кнопки
if (text.startsWith('⚙️ Админ-панель')) {
    if (!isAdmin) return false;
    return await ctx.reply("Панель управления:", menus.adminPanel(userCount));
}

  switch (text) {
    // --- ГЛАВНАЯ НАВИГАЦИЯ ---
    case "⬅️ Назад":
    case "⬅️ В главное меню":
    case "Главное меню":
      settings.waitingForBroadcastPhoto = false;
      settings.waitingForBroadcastText = false;
      settings.waitingForConfirm = false;
      storage.save(config.SETTINGS_FILE, userSettings);
      return await ctx.reply("Выберите раздел:", menus.main(isAdmin, userCount));

    case "🔮 Узнать свой Путь (Чекап)":
    case "🔮 Повторить Чекап":
      settings.isAstroCheck = true;
      storage.save(config.SETTINGS_FILE, userSettings);
      return await ctx.reply("✨ Привет! Я мастер китайской астрологии Ба Цзы. Напиши свою дату и время рождения (используй формат дд.мм.гггг чч:мм), чтобы я построил твою карту.");

    case "❓ Справка":
      return await ctx.reply("Я — твой проводник в мире коучинга, сказкотерапии и Ба Цзы. Помогаю найти ответы внутри себя, делюсь подарками и инсайтами.\n Если хочешь узнать что-то подробнее напиши моей разработчице Марии напрямую: @sherab_wangmo");

    // --- КАТЕГОРИИ УСЛУГ ---
    case "🎭 Мои Услуги":
    case "⬅️ Назад в услуги":
      return await ctx.reply("Что тебя сейчас волнует?", menus.buy());

    case "✨ Самопознание и Сказки":
      return await ctx.reply("Трансформационные программы для твоего роста:", menus.trainings());

    case "💻 IT-разработка (Боты/Сайты)":
      return await ctx.reply("Помогаю упаковать твои смыслы в технологичные решения:", menus.dev());

    // --- ЛОГИКА ВОПРОСА ---
    case "✍️ Задать вопрос":
      return await ctx.reply(
        "✍️ Нажмите на кнопку ниже, чтобы задать вопрос Марии напрямую.",
        Markup.inlineKeyboard([[Markup.button.url('✉️ Написать Марии', 'https://t.me/sherab_wangmo')]])
      );

    // --- АДМИН-ПАНЕЛЬ ---

    case "⬅️ Назад в админку":
        if (!isAdmin) return false;
        return await ctx.reply("Панель управления:", menus.adminPanel(userCount));

    case "❌ Отмена":
        if (!isAdmin) return false;
        settings.waitingForBroadcastPhoto = false;
        settings.waitingForBroadcastText = false;
        settings.waitingForConfirm = false;
        storage.save(config.SETTINGS_FILE, userSettings);
        return await ctx.reply("Отменено.", menus.adminPanel(userCount));

    case "📢 Рассылка":
        if (!isAdmin) return false;
        settings.waitingForBroadcastPhoto = true; 
        storage.save(config.SETTINGS_FILE, userSettings);
        return await ctx.reply("Пришлите контент для рассылки (текст или фото):", menus.confirmBroadcast());

/*     // --- НАСТРОЙКИ ИИ (АДМИН) ---
    case "🤖 Настройки ИИ":
    case "🤖 Сменить модель":
        if (!isAdmin) return false;
        return await ctx.reply("Настройки поиска:", menus.chatAI(settings));

    case "✅ Кратко":
    case "⚡️ Кратко":
      if (!isAdmin) return false;
      settings.mode = "short";
      storage.save(config.SETTINGS_FILE, userSettings);
      return await ctx.reply("🚀 Режим: Кратко.", menus.chatAI(settings));

    case "🧹 Очистить контекст":
      if (!isAdmin) return false;
      userHistory[userId] = []; 
      storage.save(config.HISTORY_FILE, userHistory);
      return await ctx.reply("🧹 Контекст очищен!", menus.chatAI(settings));

    case "🌍 Поиск: ВКЛ":
    case "🌍 Поиск: ВЫКЛ":
        if (!isAdmin) return false;
        settings.useSearch = !settings.useSearch;
        storage.save(config.SETTINGS_FILE, userSettings);
        return await ctx.reply(`🌐 Поиск ${settings.useSearch ? "включен" : "выключен"}`, menus.chatAI(settings)); */

    // --- ОБРАБОТКА КОНКРЕТНЫХ УСЛУГ: ТРЕНИНГИ ---
    case "✨ Курс-Путешествие":
  settings.isAstroCheck = false;
  storage.save(config.SETTINGS_FILE, userSettings);
  return await ctx.reply(
    `✨ <b>Твоя жизнь — это сказка, где ТЫ — Архитектор своей Истории</b>\n\n` +
    `Если ты чувствуешь, что застрял в "Дне сурка", играешь роль второго плана, не знаешь куда идти или как найти свой ресурс, значит пора переписать сюжет. Мой метод объединяет <b>коучинг, сказкотерапию и символдраму</b>.\n\n` + 
    `<b>Что мы сделаем в путешествии:</b>\n` +
    `• Найдем твоих внутренних "Драконов", заберем у них ресурс или превратим в твоих защитников\n` +
    `• Проложим маршрут к твоей истинной цели\n` +
    `• Напишем терапевтическую сказку, которая станет твоим планом победы\n\n` +
    `🎁 Нажми кнопку ниже, чтобы получить подарок — <b>практику «Встреча с Хранителем»</b> и почувствовать программу!`,
    { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎁 Получить подарок и программу', callback_data: 'funnel_gift' }],
          [{ text: '📜 Стоимость и форматы участия:', callback_data: 'show_prices' }],
          [{ text: '💳 Оплатить онлайн', callback_data: 'confirm_payment' }],
          [{ text: '✅ Я оплатил(а)', callback_data: 'i_paid' }],
          [{ text: '✉️ Написать Марии', url: 'https://t.me/sherab_wangmo' }]
        ]
      }
    }
  );

    case "📈 Карта Пути (Сессия)":
    settings.isAstroCheck = false;
    storage.save(config.SETTINGS_FILE, userSettings);
    return await sendMapPathSession(ctx);

    case "🔮 Повторить Чекап":
      settings.isAstroCheck = true;
      storage.save(config.SETTINGS_FILE, userSettings);
      return await ctx.reply(
        "✨ <b>Вспомним, что говорят звезды?</b>\n\n" +
        "Напиши свою дату и время рождения еще раз (дд.мм.гггг чч:мм).\n\n" +
        "<i>Я пересчитаю твой код Ба Цзы и дам актуальную коуч-подсказку под твой новый запрос.</i>",
        { parse_mode: 'HTML' }
      );

    // --- ОБРАБОТКА КОНКРЕТНЫХ УСЛУГ: РАЗРАБОТКА ---
    case "🤖 Создание ботов":
      settings.isAstroCheck = false;
      storage.save(config.SETTINGS_FILE, userSettings);
      return await ctx.reply(
        "<b>🤖 Создание умных ботов</b>\n\n" +
        "Разрабатываю не просто код, а <b>автоматизированные воронки продаж</b> с интеграцией ИИ (GPT/Claude). \n\n" +
        "Этот бот, в котором вы сейчас находитесь — пример того, как система может сама сегментировать клиентов и использовать ИИ для более умных, персонализированных ответов.\n\n" +
        "📍 <b>Срок:</b> от 10 дней\n" +
        "💳 <b>Стоимость:</b> от 15 000 ₽", 
        { 
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Оставить заявку', 'order_bot')],
                [Markup.button.url('✉️ Обсудить в ЛС', 'https://t.me/sherab_wangmo')]
            ])
        }
      );

    case "⚙️ Web-разработка":
      settings.isAstroCheck = false;
      storage.save(config.SETTINGS_FILE, userSettings);
      return await ctx.reply(
        "<b>⚙️ Fullstack Web-разработка</b>\n\n" +
        "Создание интерфейсов, сайтов, верстка макетов, разработка backend-части на Node.js. Реализую ваши идеи: от личных кабинетов до сложных калькуляторов.\n\n" +
        "📍 <b>Срок:</b> от 7 дней\n" +
        "💳 <b>Стоимость:</b> от 15 000 ₽",
        { 
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Оставить заявку', 'order_web')],
                [Markup.button.url('✉️ Обсудить в ЛС', 'https://t.me/sherab_wangmo')],
                [Markup.button.url('✉️ Портфолио', 'https://web.routes-dream.ru/')]
            ])
        }
      );

    default:
      // Если текст не совпал, возвращаем false для обработки через ИИ
      return false;
  }
};