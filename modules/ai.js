/**
 * @module AI
 * @description Диспетчер запросов к разным провайдерам (OpenRouter и Hugging Face).
* Обеспечивает отправку истории сообщений нейросети и получение текстового ответа.
 */
const { HfInference } = require('@huggingface/inference');
const axios = require('axios');
const config = require('./config');

const hf = new HfInference(config.HF_TOKEN);

const ai = {
   /**
     * Запрашивает генерацию текста у выбранной модели ИИ.
     * @async
     * @param {Array<Object>} messages - Массив объектов истории сообщений.
     * @param {string} messages[].role - Роль отправителя ('user' или 'assistant').
     * @param {string} messages[].content - Текст сообщения.
     * @param {string} model - Идентификатор модели в OpenRouter (например, 'google/gemma-2-9b-it:free').
     * @param {boolean} isShortMode - Флаг режима ответа (true для краткого, false для детального).
     * @returns {Promise<Object>} Объект ответа от Axios с данными из OpenRouter API.
     * @throws {Error} Выбрасывает ошибку при сетевом сбое или некорректном ответе от API.
     */

   async getAIResponse(messages, modelId, isShortMode) {
        // Если ID модели начинается с hf:, идем на Hugging Face
        if (modelId.startsWith('hf:')) {
            const realModel = modelId.replace('hf:', '');
            return await this.callHuggingFace(messages, realModel, isShortMode);
        }

        // Иначе идем на OpenRouter (по умолчанию)
        return await this.callOpenRouter(messages, modelId, isShortMode);
    },

    /**
     * Вызов Hugging Face Inference API
     */
    async callHuggingFace(messages, model, isShortMode) {
        try {
            // Формируем промпт (HF часто требует текст, а не массив, но SDK это правит)
            const response = await hf.chatCompletion({
                model: model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                max_tokens: isShortMode ? 500 : 1500,
                temperature: 0.7,
            });

            // Приводим ответ HF к формату, который ждет ваш bot.js (как у axios)
            return {
                data: {
                    choices: [{
                        message: {
                            content: response.choices[0].message.content
                        }
                    }]
                }
            };
        } catch (e) {
            console.error('Ошибка Hugging Face:', e.message);
            throw e;
        }
    },

    /**
     * Ваш текущий метод для OpenRouter
     */
    async callOpenRouter(messages, model, isShortMode) {
        // Очищаем историю от пустых полей и timestamp для API
        const cleanMessages = messages
            .filter(m => m && m.content && m.content.trim() !== "")
            .map(m => ({ 
                role: m.role, 
                content: String(m.content).trim() 
            }));

        if (cleanMessages.length === 0) {
            throw new Error("Пустой запрос (нет сообщений)");
        }

        try {
            const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
                      {
                    model: model,
                    messages: cleanMessages,
                    max_tokens: isShortMode ? 500 : 2000,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${config.OPENROUTER_KEY.trim()}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'Yakata Bot'
                    },
                    timeout: 45000 // Ждем ответ до 45 секунд
                }
            );
            return response;
        } catch (e) {
            if (e.code === 'ECONNRESET') {
                console.error('Сеть оборвала соединение (ECONNRESET).');
            }
            throw e;
        }
    }
};


module.exports = ai;