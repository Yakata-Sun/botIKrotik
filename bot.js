/**
 * @file bot.js
 * @description Точка входа Telegram-бота. 
 * Реализует конвейер обработки сообщений (Middleware-подобная структура):
 * 1. Инициализация пользователя -> 2. Рассылка -> 3. Меню -> 4. Смена модели -> 5. Ответ ИИ
 */

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
    // Игнорируем технические обновления без сообщения (например, сервисные сообщения групп)
    if (!ctx.message) return;

    const userId = ctx.from.id;
    const text = ctx.message.text;

    // --- 1. ИНИЦИАЛИЗАЦИЯ ДАННЫХ ---
    // Если пользователь новый, создаем для него профиль в памяти и сохраняем на диск
    if (!userSettings[userId]) {
        userSettings[userId] = { 
            selectedModel: config.DEFAULT_MODEL, 
            mode: 'short' 
        };
        storage.save(config.SETTINGS_FILE, userSettings);
    }
    
    // Инициализируем пустую историю сообщений, если её еще нет
    if (!userHistory[userId]) {
        userHistory[userId] = [];
    }

    // --- 2. ЛОГИКА АДМИН-РАССЫЛКИ ---
    // Передаем управление модулю рассылки. 
    // Если он возвращает true — значит админ сейчас "в процессе" создания рассылки,
    // и выполнение кода ниже (ИИ, меню) должно быть остановлено.
    const isBroadcastActive = await handleBroadcast(ctx, userSettings, menus, startBroadcast);
    if (isBroadcastActive) return;

    // --- 3. ФИЛЬТРАЦИЯ ТЕКСТА ---
    // Если в сообщении нет текста (например, стикер без подписи или локация), 
    // и это не было обработано в рассылке выше — выходим.
    if (!text) return;

    // --- 4. ОБРАБОТКА МЕНЮ ---
    // Проверяем, нажал ли пользователь на кнопку встроенного меню (Настройки, Модель и т.д.)
  const menuHandled = await handleMenu(ctx, userSettings, userHistory);
if (menuHandled) return;

    // --- 5. БЫСТРАЯ СМЕНА МОДЕЛИ ---
    // Если текст сообщения совпадает с названием одной из моделей в конфиге, 
    // обновляем настройки и переключаем интерфейс на чат.
    const selectedModelPath = config.MODELS[text]; 
    if (selectedModelPath) {
        userSettings[userId].selectedModel = selectedModelPath;
        storage.save(config.SETTINGS_FILE, userSettings);
        return await ctx.reply(`✅ Модель установлена`, menus.chatAI(userSettings[userId])); 
    }

    // --- 6. ЗАПРОС К ИСКУССТВЕННОМУ ИНТЕЛЛЕКТУ ---
    // Если сообщение дошло до этой точки, значит это обычный вопрос пользователя.
    // Вызываем модуль обработки AI запроса.
    await handleAIRequest(ctx, userSettings, userHistory, menus);
});

/**
 * Запуск бота и вывод уведомления в консоль
 */
bot.launch()
    .then(() => console.log('🚀 Бот успешно запущен и готов к работе!'))
    .catch((err) => console.error('❌ Ошибка при запуске бота:', err));

// Мягкая остановка при завершении процесса
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));