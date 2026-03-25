const storage = require('./storage');
const config = require('./config');
const ai = require('./ai');
const menus = require('./menus')

/**
 * @module AIHandler
 * @description Теперь работает ТОЛЬКО как админ-поиск в сети.
 */

/**
 * Обработчик поисковых запросов в сети (только для Админа).
 * 
 * @async
 * @param {Object} ctx - Контекст Telegraf.
 * @param {Object} userSettings - Настройки пользователей (не используются, так как режим один).
 * @param {Object} userHistory - История диалогов (для поиска не храним).
 */
async function handleAIRequest(ctx, userSettings, userHistory) {
    const userId = ctx.from.id;
    const text = ctx.message.text;
     const settings = userSettings[userId];


    // 1. ПРОВЕРКА НА АДМИНА
    if (userId !== config.ADMIN_ID) {
        return await ctx.reply("✨ Я общаюсь только в рамках <b>Астро-чекапа</b>.\nИспользуйте меню услуг ниже 👇", { parse_mode: 'HTML' });
    }

    // 2. ИЗВЛЕЧЕНИЕ ЗАПРОСА (если это команда /search)
    const query = text.startsWith('/search') ? text.replace('/search', '').trim() : text;

    if (!query) {
        return await ctx.reply("🔎 Напишите запрос, например: <code>/search главные тренды Ба-Цзы в 2026 году</code>", { parse_mode: 'HTML' });
    }

    try {
        await ctx.sendChatAction('typing');

        // 1. ОПРЕДЕЛЯЕМ МОДЕЛЬ
        // Если поиск включен, добавляем префикс search: к ВЫБРАННОЙ тобой модели
        let model = settings.selectedModel || config.DEFAULT_MODEL;
        if (settings.useSearch) {
            model = `search:${model}`;
        }

        // 2. КОНТЕКСТ
        // Для поиска лучше не слать длинную историю, для чата — шлем
        let messages = settings.useSearch 
            ? [{ role: 'user', content: text }]
            : [...(userHistory[userId] || []), { role: 'user', content: text }];

        // 3. ЗАПРОС
        const response = await ai.getAIResponse(messages, model, settings.mode === 'short');
        const answer = (response.data.choices?.[0]?.message?.content || "").trim();

        if (answer) {
            if (!settings.useSearch) {
                userHistory[userId].push({ role: 'user', content: text });
                userHistory[userId].push({ role: 'assistant', content: answer });
                storage.save(config.HISTORY_FILE, userHistory);
            }
            
            const prefix = settings.useSearch ? "🌐 <b>Найденный ответ:</b>\n\n" : "";
            await ctx.reply(prefix + answer, { parse_mode: 'HTML', ...menus.chatAI(settings) });
        }
    } catch (e) {
        console.error('Ошибка в Админ-ИИ:', e.message);
        await ctx.reply("⚠️ Ошибка. Попробуйте сменить модель.");
    }
}

module.exports = handleAIRequest;