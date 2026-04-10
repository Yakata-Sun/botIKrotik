/**
 * @file bot.js
 * @description Точка входа Telegram-бота. 
 * Реализует конвейер обработки сообщений (Middleware-подобная структура):
 * 1. Инициализация пользователя -> 2. Рассылка -> 3. Меню -> 4. Смена модели -> 5. Ответ ИИ
 */
require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const { Telegraf, Markup  } = require("telegraf");

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
const receipts = require('./modules/receipts');

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
let userHistory = storage.load(config.HISTORY_FILE) || {};
if (Array.isArray(userHistory)) userHistory = {}; 

// Регистрация глобальных команд (/start, /help и др.)
registerCommands(bot, userSettings, userHistory);
// 3. РЕГИСТРАЦИЯ ВОРОНКИ И КНОПОК (Один раз при запуске!)
funnel.init(bot); 
registerActions(bot, { userSettings, astro, funnel, storage, menus, config });

// === ОБРАБОТЧИКИ ДЛЯ АДМИНСКОЙ УТИЛИТЫ ===
// Эти обработчики идут ПЕРЕД обработчиками чеков!
bot.on('photo', async (ctx, next) => {
  const userId = ctx.from?.id;
  
  // Только для админа и только если НЕ ожидается чек
  if (userId == config.ADMIN_ID) {
    const settings = storage.getUserSettings(userId);
    if (settings.awaitingReceipt !== true) { // Явная проверка на false/null/undefined
      const processed = await utils.trackFileIds(ctx);
      if (processed) {
        return; // Останавливаем обработку, ID отправлен
      }
    }
  }
  return next(); // Передаем дальше к обработчикам чеков
});

bot.on('document', async (ctx, next) => {
  const userId = ctx.from?.id;
  
  // Только для админа и только если НЕ ожидается чек
  if (userId == config.ADMIN_ID) {
    const settings = storage.getUserSettings(userId);
    if (settings.awaitingReceipt !== true) { // Явная проверка на false/null/undefined
      const processed = await utils.trackFileIds(ctx);
      if (processed) {
        return; // Останавливаем обработку, ID отправлен
      }
    } 
  }
  return next(); // Передаем дальше к обработчикам чеков
});

// РЕГИСТРАЦИЯ ОБРАБОТЧИКОВ ЧЕКОВ
receipts.registerReceiptHandlers(bot);

/**
 * Основной слушатель всех входящих сообщений
 */
bot.on('message', async (ctx) => {
if (!ctx.message) return;

if (ctx.message.text && ctx.message.text.startsWith('/')) return; // ПЕРВЫМ ДЕЛОМ: Игнорируем команды, чтобы они ушли в registerCommands

const userId = String(ctx.from.id);
const text = ctx.message.text;

// --- ПОЛНАЯ ИНИЦИАЛИЗАЦИЯ (Всегда первая) ---
let changed = false;

if (!userHistory[userId]) {
    userHistory[userId] = [];
    changed = true;
}

if (!userSettings[userId]) {
    userSettings[userId] = { 
        selectedModel: config.DEFAULT_MODEL, 
        mode: 'short',
        isAstroCheck: false
    };
    changed = true;
}

// Сохраняем один раз, если что-то добавили
if (changed) {
    storage.save(config.HISTORY_FILE, userHistory);
    storage.save(config.SETTINGS_FILE, userSettings);
}

// --- 2. ЛОГИКА АДМИН-РАССЫЛКИ ---
const isBroadcastActive = await handleBroadcast(ctx, userSettings, menus, startBroadcast, userHistory, bot);
if (isBroadcastActive) return;


// Только если НЕ в режиме рассылки, но АДМИН - отслеживаем ID файлов
const isFileProcessed = await utils.trackFileIds(ctx);
if (isFileProcessed) return;


// --- 3. ФИЛЬТРАЦИЯ ТЕКСТА ---
if (!text) return;


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
        await ctx.reply("✨ Если вы хотите написать Марии, перейдите в ЛС https://t.me/sherab_wangmo'", { parse_mode: 'HTML' });
    }
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
process.once('SIGINT', () => {
  if (bot.botInfo) { // Проверка, что бот был инициализирован
    bot.stop('SIGINT');
  }
});
process.once('SIGTERM', () => bot.stop('SIGTERM'));