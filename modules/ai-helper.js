const ai = require('./ai');
const config = require('./config');

/**
 * Универсальный решатель для ИИ с перебором моделей
 * @param {Array} messages - Массив сообщений для ИИ
 * @param {Boolean} isJson - Ожидаем ли мы JSON в ответе
 * @returns {String|Object|null} - Ответ или null если всё упало
 */
async function askAI(messages, isJson = false) {
    const modelsToTry = config.ASTRO_MODELS || [config.DEFAULT_MODEL];
    
    for (const modelId of modelsToTry) {
        try {
            console.log(`🔮 AI Helper: Пробую модель ${modelId}...`);
            const response = await ai.getAIResponse(messages, modelId, isJson);
            const content = response.data.choices?.[0]?.message?.content;

            if (content) {
                console.log(`✅ AI Helper: Успех с ${modelId}`);
                if (isJson) {
                    try { return JSON.parse(content); } 
                    catch (e) { console.error("Ошибка парсинга JSON от ИИ"); }
                }
                return content.trim();
            }
        } catch (err) {
            console.error(`⚠️ AI Helper: Модель ${modelId} не ответила:`, err.message);
        }
    }
    return null;
}

module.exports = { askAI };