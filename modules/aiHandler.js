const storage = require('./storage');
const config = require('./config');
const ai = require('./ai');

/**
 * Обработчик запросов к ИИ с контролем длины контекста.
 * @param {Object} ctx - Контекст Telegraf
 * @param {Object} userSettings - Настройки пользователя
 * @param {Object} userHistory - История диалогов
 * @param {Object} menus - Модуль меню
 */
async function handleAIRequest(ctx, userSettings, userHistory, menus) {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    
    const model = userSettings[userId].selectedModel || config.DEFAULT_MODEL;
    const isShortMode = userSettings[userId].mode === 'short';

    try {
        await ctx.sendChatAction('typing');

        // 1. Добавляем вопрос пользователя
        userHistory[userId].push({ role: 'user', content: text, timestamp: Date.now() });

        // 2. ЖЕСТКАЯ ОБРЕЗКА ИСТОРИИ (чтобы файл не рос бесконечно)
        // Если в истории больше сообщений, чем в лимите — удаляем старые
        const limit = config.MAX_HISTORY || 20;
        if (userHistory[userId].length > limit) {
            userHistory[userId] = userHistory[userId].slice(-limit);
        }

        // 3. Запрос к API (передаем уже подготовленный массив)
        const response = await ai.getAIResponse(
            userHistory[userId], 
            model, 
            isShortMode
        );
        
        const choice = response.data.choices?.[0];
        const answer = (choice?.message?.content || "").trim();

        if (answer) {
            // 4. Добавляем ответ ИИ и сохраняем на диск уже обрезанную версию
            userHistory[userId].push({ role: 'assistant', content: answer, timestamp: Date.now() });
            
            // Еще раз проверяем лимит после добавления ответа ИИ
            if (userHistory[userId].length > limit) {
                userHistory[userId] = userHistory[userId].slice(-limit);
            }

            storage.save(config.HISTORY_FILE, userHistory);
            
            await ctx.reply(answer, menus.chatAI(userSettings[userId]));
        } else {
            userHistory[userId].pop(); 
            await ctx.reply("🤖 ИИ прислал пустой ответ. Попробуйте еще раз.");
        }
    } catch (e) {
        if (userHistory[userId].length > 0) userHistory[userId].pop();
        console.error('Ошибка ИИ:', e.message);
        await ctx.reply("⚠️ Ошибка связи. Попробуйте другую модель.");
    }
}

module.exports = handleAIRequest;