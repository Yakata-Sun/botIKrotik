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
const registerActions = require('./modules/actions');
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
registerCommands(bot, userSettings, userHistory);

/**
 * Основной слушатель всех входящих сообщений
 */
bot.on('message', async (ctx) => {
    if (!ctx.message) return;
        const userId = ctx.from.id;
    const text = ctx.message.text;

            // 1. Если пользователя нет в истории - ДОБАВЛЯЕМ И СОХРАНЯЕМ СРАЗУ
    if (!userHistory[userId]) {
        userHistory[userId] = []; // Создаем пустую ячейку
        // ВЫЗЫВАЕМ STORAGE.SAVE
        storage.save(config.HISTORY_FILE, userHistory); 
        console.log(`✅ ID ${userId} зафиксирован в базе истории.`);
    }

    // 1. ОТСЛЕЖИВАНИЕ ID ФАЙЛОВ ДЛЯ АДМИНА
    const isFileProcessed = await utils.trackFileIds(ctx);
    if (isFileProcessed) return; 



    // --- 1. ИНИЦИАЛИЗАЦИЯ ДАННЫХ ---
    if (!userSettings[userId]) {
        userSettings[userId] = { 
            selectedModel: config.DEFAULT_MODEL, 
            mode: 'short',
            isAstroCheck: false
        };
        storage.save(config.SETTINGS_FILE, userSettings);
    }
 
    // --- 2. ЛОГИКА АДМИН-РАССЫЛКИ ---
    const isBroadcastActive = await handleBroadcast(ctx, userSettings, menus, startBroadcast, userHistory);
    if (isBroadcastActive) return;

    // --- 3. ФИЛЬТРАЦИЯ ТЕКСТА ---
    if (!text) return;

     // ---  ПРОВЕРКА ВОРОНКИ СКАЗКИ ---
    // Если пользователь на этапе ввода животного, funnel.handleText вернет true и прервет дальнейший код
    const isFunnelStep = await funnel.handleText(ctx, userSettings);
    if (isFunnelStep) return; 

    // --- 4. АСТРО-ЧЕКАП (Геймификация для всех) ---
    if (userSettings[userId].isAstroCheck) {
        const astroResult = await astro.handle(ctx, userSettings, userHistory, menus);
        // Если вернул false — значит нажата кнопка меню, идем дальше. Иначе — прерываемся.
        if (astroResult !== false) return; 
    }

    // --- 5. ОБРАБОТКА МЕНЮ (Услуги, Тренинги и т.д.) ---
    const menuHandled = await handleMenu(ctx, userSettings, userHistory);
    if (menuHandled) return;

    // --- 6. БЫСТРАЯ СМЕНА МОДЕЛИ (Только для Админа) ---
    const selectedModelPath = config.MODELS[text]; 
    if (selectedModelPath && userId === config.ADMIN_ID) {
        userSettings[userId].selectedModel = selectedModelPath;
        storage.save(config.SETTINGS_FILE, userSettings);
        return await ctx.reply(`✅ Модель установлена`, menus.chatAI(userSettings[userId])); 
    }

    // --- 7. РАЗДЕЛЕНИЕ ДОСТУПА К ИИ ---
    if (userId === config.ADMIN_ID) {
        // Если пишешь ты — включается твой поиск/чат через обновленный aiHandler
        await handleAIRequest(ctx, userSettings, userHistory, menus);
    } else {
        // Если пишет обычный пользователь (не в режиме чекапа и не кнопка меню)
        await ctx.reply("✨ Чтобы пообщаться со звездами и получить разбор, выберите <b>🔮 Астро-чекап</b> в меню услуг.", { parse_mode: 'HTML' });
    }
});
// РЕГИСТРАЦИЯ ВСЕХ ACTIONS (Кнопок)
// Просто вызываем функцию и передаем туда всё необходимое
registerActions(bot, { 
    userSettings, 
    astro, 
    funnel, 
    storage,
    menus, // если кнопки будут вызывать меню
    config 
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