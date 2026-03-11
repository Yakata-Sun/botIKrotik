require('dotenv').config();
const { Telegraf } = require("telegraf");
const config = require('./modules/config');
const storage = require('./modules/storage');
const ai = require('./modules/ai');
const menus = require('./modules/menus');
const handleMenu = require('./modules/handlers');
const registerCommands = require('./modules/commands');
const startBroadcast = require('./modules/broadcast');

const bot = new Telegraf(config.BOT_TOKEN);

let userSettings = storage.load(config.SETTINGS_FILE);
let userHistory = storage.load(config.HISTORY_FILE);

registerCommands(bot, userSettings);

bot.on('message', async (ctx) => {
    // Убираем жесткую проверку на текст в начале, чтобы бот видел ФОТО
    if (!ctx.message) return;

    const text = ctx.message.text;
    const userId = ctx.from.id;
    const admin = userSettings[userId];

    // 1. Инициализация
    if (!userSettings[userId]) {
        userSettings[userId] = { selectedModel: config.DEFAULT_MODEL, mode: 'short' };
    }
    if (!userHistory[userId]) userHistory[userId] = [];

    // =====================================================
    // ЛОГИКА РАССЫЛКИ (Должна быть ПЕРЕД логикой ИИ)
    // =====================================================
    if (userId === config.ADMIN_ID) {
        // ШАГ 1: Ожидание контента
        if (admin?.waitingForBroadcastPhoto) {
            if (text === '❌ Отмена') {
                admin.waitingForBroadcastPhoto = false;
                return ctx.reply('Рассылка отменена.', menus.main());
            }
            if (ctx.message.photo) {
                admin.broadcastPhotoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                admin.waitingForBroadcastPhoto = false;
                admin.waitingForBroadcastText = true;
                return ctx.reply('📸 Фото принято. Пришлите текст описания:');
            }
            if (text) {
                admin.broadcastDraftText = text;
                admin.broadcastPhotoId = null;
                admin.waitingForBroadcastPhoto = false;
                admin.waitingForConfirm = true;
                return ctx.reply(`Предпросмотр сообщения:\n\n${text}`, menus.confirmBroadcast());
            }
        }

        // ШАГ 2: Ожидание текста (после фото)
        if (admin?.waitingForBroadcastText && text) {
            admin.broadcastDraftText = text;
            admin.waitingForBroadcastText = false;
            admin.waitingForConfirm = true;
            return ctx.sendPhoto(admin.broadcastPhotoId, {
                caption: `Предпросмотр сообщения:\n\n${text}`,
                ...menus.confirmBroadcast()
            });
        }

        // ШАГ 3: Подтверждение
        if (admin?.waitingForConfirm) {
            if (text === '✅ Отправить всем') {
                admin.waitingForConfirm = false;
                const finalPhoto = admin.broadcastPhotoId;
                const finalText = admin.broadcastDraftText;
                admin.broadcastPhotoId = null;
                admin.broadcastDraftText = null;
                // ВАЖНО: Передаем аргументы правильно для вашего модуля
                return startBroadcast(ctx, userSettings, menus, finalText, finalPhoto);
            }
            if (text === '❌ Отмена') {
                admin.waitingForConfirm = false;
                admin.broadcastPhotoId = null;
                admin.broadcastDraftText = null;
                return ctx.reply('Рассылка отменена.', menus.main());
            }
        }
    }

    // =====================================================
    // ОБЫЧНАЯ ЛОГИКА (Если не в режиме рассылки)
    // =====================================================
    if (!text) return; // Для ИИ нам нужен только текст

    const model = userSettings[userId].selectedModel || config.DEFAULT_MODEL;
    const isShortMode = userSettings[userId].mode === 'short';

    const menuHandled = await handleMenu(ctx, userSettings);
    if (menuHandled) return;

    const selectedModelPath = config.MODELS[text]; 
    if (selectedModelPath) {
        userSettings[userId].selectedModel = selectedModelPath;
        storage.save(config.SETTINGS_FILE, userSettings);
        return await ctx.reply(`✅ Модель установлена.`, menus.chatAI(userSettings[userId])); 
    }

    // 5. Логика ИИ
    try {
        await ctx.sendChatAction('typing');
        userHistory[userId].push({ role: 'user', content: text });

        const response = await ai.getAIResponse(
            userHistory[userId].slice(-config.MAX_HISTORY), 
            model, 
            isShortMode
        );
        
        const choice = response.data.choices?.[0];
        const message = choice?.message || {};
        const answer = message.content || "";

        if (answer) {
            const timestamp = Date.now();
            userHistory[userId].push({ role: 'user', content: text, timestamp });
            userHistory[userId].push({ role: 'assistant', content: answer, timestamp });

  // Очищаем историю от старых записей перед сохранением
    cleanOldHistory(userHistory); 

            storage.save(config.HISTORY_FILE, userHistory);
            await ctx.reply(answer, menus.chatAI(userSettings[userId]));
        } else {
            throw new Error("Пустой ответ");
        }
    } catch (e) {
        console.error('Ошибка ИИ:', e.message);
        await ctx.reply("⚠️ Ошибка. Попробуйте позже.", menus.main());
    }
});

bot.launch().then(() => console.log('🚀 Бот запущен!'));