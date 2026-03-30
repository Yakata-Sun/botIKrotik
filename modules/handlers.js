/**
 * @module Handlers
 * @description Основной контроллер навигации. Обрабатывает нажатия кнопок Reply-меню и переключает экраны.
 */
const { Markup } = require('telegraf');
const storage = require("./storage");
const config = require("./config");
const menus = require("./menus");

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
     let count = Object.keys(userHistory).length; // Считаем ID в базе

   console.log(`Проверка админа: Ваш ID ${userId}, ID в конфиге ${config.ADMIN_ID}, Итог: ${userId === config.ADMIN_ID}`);

  // Если настроек нет (защита от ошибок), выходим
  if (!settings) return false;

 // Очистка состояния чекапа при переходе в другие разделы
  const stopAstroButtons = ['🎭 Мои Услуги', '🔮 Узнать свой Путь (Чекап)', '✨ Самопознание и Сказки', '⬅️ Назад'];
  if (stopAstroButtons.includes(text)) {
      settings.isAstroCheck = false;
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
      return await ctx.reply("Выберите раздел:", menus.main(isAdmin));

    case "🔮 Узнать свой Путь (Чекап)":
    case "🔮 Повторить Чекап":
      settings.isAstroCheck = true;
      storage.save(config.SETTINGS_FILE, userSettings);
      return await ctx.reply("✨ Привет! я мастер китайской астрологии Ба Цзы. Напиши свою дату и время рождения (например: 26.08.1983 14:30), чтобы я построила твою карту.");

    case "❓ О методе":
      return await ctx.reply("Я — твой проводник в мире коучинга, сказкотерапии и Ба Цзы. Помогаю найти ответы внутри себя, делюсь подарками и инсайтами. Если хочешь узнать подробнее напиши моей разработчице Марии напрямую: @sherab_wangmo");

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
    case "⚙️ Админ-панель":
    case "⬅️ Назад в админку":
        if (!isAdmin) return false;
        return await ctx.reply("Панель управления:", menus.adminPanel(count));

    case "❌ Отмена":
        if (!isAdmin) return false;
        settings.waitingForBroadcastPhoto = false;
        settings.waitingForBroadcastText = false;
        settings.waitingForConfirm = false;
        storage.save(config.SETTINGS_FILE, userSettings);
        return await ctx.reply("Отменено.", menus.adminPanel(count));

    case "📢 Рассылка":
        if (!isAdmin) return false;
        settings.waitingForBroadcastPhoto = true; 
        storage.save(config.SETTINGS_FILE, userSettings);
        return await ctx.reply("Пришлите контент для рассылки (текст или фото):", menus.confirmBroadcast());

    // --- НАСТРОЙКИ ИИ (АДМИН) ---
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
        return await ctx.reply(`🌐 Поиск ${settings.useSearch ? "включен" : "выключен"}`, menus.chatAI(settings));

    // --- ОБРАБОТКА КОНКРЕТНЫХ УСЛУГ: ТРЕНИНГИ ---
    case "✨ Курс-Путешествие":
      settings.isAstroCheck = false;
      storage.save(config.SETTINGS_FILE, userSettings);
      return await ctx.reply(
        `✨ <b>Твоя жизнь — это сказка, где ТЫ — Автор сценария</b>\n\n` +
        `Если ты чувствуешь, что застрял в "Дне сурка", играешь роль второго плана, не знаешь куда идти, значит пора переписать сюжет. Мой метод объединяет <b>коучинг, сказкотерапию и символдраму</b>.\n\n` + 
        `<b>Что мы сделаем в путешествии:</b>\n` +
        `• Найдем твоих внутренних "Драконов" и заберем у них ресурс\n` +
        `• Проложим маршрут к твоей истинной цели\n` +
        `• Напишем терапевтическую сказку, которая станет твоим планом победы\n\n` +
        `🎁 Нажми кнопку ниже, чтобы получить подарок — <b>практику «Встреча с Хранителем»</b> и увидеть программу!`,
        { 
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎁 Получить подарок и программу', callback_data: 'funnel_gift' }],
              [{ text: '✉️ Написать Марии', url: 'https://t.me/sherab_wangmo' }]
            ]
          }
        }
      );

    case "📈 Карта Пути (Сессия)":
      settings.isAstroCheck = false;
      storage.save(config.SETTINGS_FILE, userSettings);
      return await ctx.reply(
        `📍 <b>Сессия «Карта Пути»</b> — это точка сборки твоего пути.\n\n` +
        `Всего за одну глубокую встречу с использованием МАК-карт мы:\n` +
        `• Разберем твой запрос "по косточкам"\n` +
        `• Найдем скрытые препятствия, которые не видны изнутри\n` +
        `• Составим план из 3-х конкретных шагов к твоей цели\n\n` +
        `Это формат для тех, кто ценит время и хочет получить **ясность за 60 минут**.\n\n` +
        `Готов составить свою карту?`,
        { 
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Да, я хочу на сессию!', callback_data: 'fast_coaching_start' }],
              [{ text: '✉️ Задать вопрос напрямую', url: 'https://t.me/sherab_wangmo' }]
            ]
          }
        }
      );

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
        "Этот бот, в котором вы сейчас находитесь — пример того, как система может сама сегментировать клиентов и делать расчеты Ба Цзы.\n\n" +
        "📍 <b>Срок:</b> от 7 дней\n" +
        "💳 <b>Стоимость:</b> от 15 000 ₽", 
        { 
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Оставить заявку', 'order_bot')],
                [Markup.button.url('✉️ Обсудить в ЛС', 'https://t.me')]
            ])
        }
      );

    case "⚙️ Создание лендинга":
      settings.isAstroCheck = false;
      storage.save(config.SETTINGS_FILE, userSettings);
      return await ctx.reply(
        "<b>⚙️ Продающие лендинги</b>\n\n" +
        "Создаю современные страницы с высокой конверсией. Помогаю упаковать смыслы вашего продукта, чтобы сайт не просто висел, а приносил заявки.\n\n" +
        "📍 <b>Срок:</b> от 14 дней\n" +
        "💳 <b>Стоимость:</b> от 15 000 ₽",
        { 
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Оставить заявку', 'order_lending')],
                [Markup.button.url('🎨 Посмотреть портфолио', 'https://t.me')] // Замените на свою ссылку если есть
            ])
        }
      );

    case "🤖 Доработка ботов":
      settings.isAstroCheck = false;
      storage.save(config.SETTINGS_FILE, userSettings);
      return await ctx.reply(
        "<b>🤖 Второе дыхание для вашего бота</b>\n\n" +
        "Исправляю ошибки, добавляю новые функции (платежи, ИИ, рассылки) и оптимизирую текущий код для стабильной работы.\n\n" +
        "📍 <b>Срок:</b> от 5 дней\n" +
        "💳 <b>Стоимость:</b> от 5 000 ₽",
        { 
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Оставить заявку', 'order_bot_good')]
            ])
        }
      );

    case "⚙️ Web-разработка":
      settings.isAstroCheck = false;
      storage.save(config.SETTINGS_FILE, userSettings);
      return await ctx.reply(
        "<b>⚙️ Fullstack Web-разработка</b>\n\n" +
        "Создание интерфейсов, верстка макетов и разработка backend-части на Node.js. Реализую ваши идеи: от личных кабинетов до сложных калькуляторов.\n\n" +
        "📍 <b>Срок:</b> от 7 дней\n" +
        "💳 <b>Стоимость:</b> от 15 000 ₽",
        { 
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Оставить заявку', 'order_web')]
            ])
        }
      );

    default:
      // Если текст не совпал, возвращаем false для обработки через ИИ
      return false;
  }
};