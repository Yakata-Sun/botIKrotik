const storage = require('./storage');
const config = require('./config');
const ai = require('./ai');

/**
 * @module AIHandler
 * @description Контроллер для стандартных диалогов с ИИ (чат-режим).
 */

/**
 * Обработчик запросов к ИИ с контролем контекста и сохранением истории.
 * 
 * @async
 * @param {Object} ctx - Контекст Telegraf.
 * @param {Object} userSettings - Настройки пользователей.
 * @param {Object} userHistory - История диалогов.
 * @param {Object} menus - Модуль меню.
 */
async function handleAIRequest(ctx, userSettings, userHistory, menus) {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    const settings = userSettings[userId];
    const limit = config.MAX_HISTORY || 10;

    // 1. ОПРЕДЕЛЕНИЕ ПАРАМЕТРОВ МОДЕЛИ
    let model = settings.selectedModel || config.DEFAULT_MODEL;
    let isShortMode = settings.mode === 'short';

    try {
        // Визуальная индикация «печатает...»
        await ctx.sendChatAction('typing');

        // 2. ПОДГОТОВКА КОНТЕКСТА
        // Собираем историю и добавляем текущее сообщение пользователя
        let messages = [...(userHistory[userId] || [])];
        messages.push({ role: 'user', content: text, timestamp: Date.now() });

        // Обрезаем историю до лимита, чтобы не перегружать токены
        if (messages.length > limit) {
            messages = messages.slice(-limit);
        }

        // 3. ЗАПРОС К API
        const response = await ai.getAIResponse(messages, model, isShortMode);
        
        const choice = response.data.choices?.[0];
        const answer = (choice?.message?.content || "").trim();

        if (answer) {
            // 4. СОХРАНЕНИЕ В ИСТОРИЮ
            userHistory[userId].push({ role: 'assistant', content: answer, timestamp: Date.now() });
            
            // Финальная обрезка истории перед записью в файл
            if (userHistory[userId].length > limit) {
                userHistory[userId] = userHistory[userId].slice(-limit);
            }

            storage.save(config.HISTORY_FILE, userHistory);
            
            // 5. ОТВЕТ ПОЛЬЗОВАТЕЛЮ С МЕНЮ ЧАТА
            await ctx.reply(answer, menus.chatAI(settings));
        } else {
            // Откат истории при пустом ответе
            if (userHistory[userId].length > 0) userHistory[userId].pop(); 
            await ctx.reply("🤖 ИИ прислал пустой ответ. Попробуйте еще раз или смените модель.");
        }
    } catch (e) {
        // Защита от ошибок связи
        if (userHistory[userId] && userHistory[userId].length > 0) userHistory[userId].pop();
        console.error('❌ Ошибка в handleAIRequest:', e.message);
        await ctx.reply("⚠️ Ошибка связи с ИИ. Попробуйте другую модель в настройках.");
    }
}

module.exports = handleAIRequest;