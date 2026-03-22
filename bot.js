/**
 * @file bot.js
 * @description Точка входа Telegram-бота. 
 * Реализует конвейер обработки сообщений (Middleware-подобная структура):
 * 1. Инициализация пользователя -> 2. Рассылка -> 3. Меню -> 4. Смена модели -> 5. Ответ ИИ
 */
require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const { Telegraf } = require("telegraf");

// Подключение внутренних модулей
const config = require('./modules/config');
const storage = require('./modules/storage');
const menus = require('./modules/menus');
const handleMenu = require('./modules/handlers');
const registerCommands = require('./modules/commands');
const startBroadcast = require('./modules/broadcast');
const handleBroadcast = require('./modules/broadcastHandler');
const handleAIRequest = require('./modules/aiHandler');
const funnel = require('./modules/funnel');
const utils = require('./modules/utils');
const astro = require('./modules/astro');

/** @type {Telegraf} Экземпляр бота */
const bot = new Telegraf(config.BOT_TOKEN);

/** 
 * @type {Object} База данных настроек (модель, режим краткости)
 * Ключ — ID пользователя, значение — объект настроек.
 */
let userSettings = storage.load(config.SETTINGS_FILE);

/** 
 * @type {Object} База данных истории диалогов
 * Ключ — ID пользователя, значение — массив сообщений {role, content, timestamp}.
 */
let userHistory = storage.load(config.HISTORY_FILE);

// Регистрация глобальных команд (/start, /help и др.)
registerCommands(bot, userSettings);

/**
 * Основной слушатель всех входящих сообщений
 */
bot.on('message', async (ctx) => {
    // 1. СРАЗУ ИГНОРИРУЕМ ТЕХНИЧЕСКИЕ ОБНОВЛЕНИЯ (чтобы код ниже не упал)
    if (!ctx.message) return;

    // 2. ОТСЛЕЖИВАНИЕ ID ФАЙЛОВ ДЛЯ АДМИНА
    // Вынесено в начало, так как файлы (фото/док) не имеют поля .text
    const isFileProcessed = await utils.trackFileIds(ctx);
    if (isFileProcessed) return; 

    const userId = ctx.from.id;
    const text = ctx.message.text;

    // --- 1. ИНИЦИАЛИЗАЦИЯ ДАННЫХ ---
    if (!userSettings[userId]) {
        userSettings[userId] = { 
            selectedModel: config.DEFAULT_MODEL, 
            mode: 'short',
            isAstroCheck: false
        };
        storage.save(config.SETTINGS_FILE, userSettings);
    }
    
    if (!userHistory[userId]) {
        userHistory[userId] = [];
    }
 
    // --- 2. ЛОГИКА АДМИН-РАССЫЛКИ ---
    const isBroadcastActive = await handleBroadcast(ctx, userSettings, menus, startBroadcast);
    if (isBroadcastActive) return;

    // --- 3. ФИЛЬТРАЦИЯ ТЕКСТА ---
    // Если текста нет (и это не был файл админа выше), то дальше делать нечего
    if (!text) return;

       //--4. Астро-чекап
if (userSettings[userId].isAstroCheck && text) {
    const astroResult = await astro.handle(ctx, userSettings, userHistory, menus);
    
    // Если astro.handle вернул false — значит, нажата кнопка меню, 
    // и нам нужно продолжить выполнение кода ниже (к хендлерам меню)
    if (astroResult === false) {
        // Ничего не делаем, идем дальше к handleMenu
    } else {
        return; // Если расчет прошел или выдана ошибка даты — прерываемся
    }
}
    // --- 5. ОБРАБОТКА МЕНЮ (Услуги, Тренинги и т.д.) ---
    const menuHandled = await handleMenu(ctx, userSettings, userHistory);
    if (menuHandled) return;

    // --- 6. БЫСТРАЯ СМЕНА МОДЕЛИ ---
    const selectedModelPath = config.MODELS[text]; 
    if (selectedModelPath) {
        userSettings[userId].selectedModel = selectedModelPath;
        storage.save(config.SETTINGS_FILE, userSettings);
        return await ctx.reply(`✅ Модель установлена`, menus.chatAI(userSettings[userId])); 
    }


    // --- 7. ЗАПРОС К ИСКУССТВЕННОМУ ИНТЕЛЛЕКТУ ---
    await handleAIRequest(ctx, userSettings, userHistory, menus);
});

// Обработка всех кнопок, которые начинаются на order_
bot.action(/^order_(.+)$/, async (ctx) => {
    const serviceType = ctx.match[1]; // получим 'lending', 'bot' и т.д.
    const user = ctx.from;

    // 1. Уведомление тебе в личку
    const report = `🔔 <b>НОВАЯ ЗАЯВКА!</b>\n\n` +
                   `📦 Услуга: <code>${serviceType}</code>\n` +
                   `👤 Клиент: ${user.first_name} (@${user.username || 'нет'})\n` +
                   `🆔 ID: <code>${user.id}</code>`;

    await ctx.telegram.sendMessage(config.ADMIN_ID, report, { parse_mode: 'HTML' });

    // 2. Красивый ответ пользователю
    await ctx.answerCbQuery(); // Убирает "часики" на кнопке
    await ctx.reply("✨ Спасибо! Ваша заявка получена. Мария свяжется с вами в ближайшее время.");
});

funnel.init(bot); //воронка сказки


// --- МИНИ-ВОРОНКА: БЫСТРЫЙ КОУЧИНГ ---
bot.action('fast_coaching_start', async (ctx) => {
    await ctx.answerCbQuery();
    
    // Получите ID вашего чек-листа (PDF), отправив его боту
    const checklistId = 'ВАШ_FILE_ID_ЧЕКЛИСТА_БЫСТРЫЙ_КОУЧИНГ'; 

    await ctx.reply(
        "💪 Отличный выбор! Первый шаг к решению — это честный взгляд на ситуацию.\n\n" +
        "Ловите чек-лист, который поможет вам подготовиться к сессии и точно сформулировать запрос.",
        { parse_mode: 'HTML' }
    );

    // Отправляем файл и кнопку записи
    await ctx.replyWithDocument(checklistId, {
        caption: "📋 Чек-лист «Самодиагностика запроса»",
        reply_markup: Markup.inlineKeyboard([
            [Markup.button.url('📅 Забронировать сессию', 'https://t.me')]
        ]).reply_markup
    });
});
/**
 * Запуск бота и вывод уведомления в консоль
 */
bot.launch()
    .then(() => console.log('🚀 Бот запущен!'))
    .catch((err) => {
        if (err.code === 'ECONNRESET') {
            console.error('⚠️ Ошибка сети (ECONNRESET). Проверьте интернет или VPN.');
        } else {
            console.error('❌ Ошибка запуска:', err);
        }
    });

// Мягкая остановка при завершении процесса
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));