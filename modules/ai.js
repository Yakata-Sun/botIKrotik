const { HfInference } = require('@huggingface/inference');
const searchProvider = require('./search');
const axios = require('axios');
const config = require('./config');

const hf = new HfInference(config.HF_TOKEN);

const ai = {
    /**
     * ГЛАВНЫЙ ДИСПЕТЧЕР
     */
    async getAIResponse(messages, modelId, isShortMode) {
        if (modelId.startsWith('search:')) {
            return await this.callSearchWithOpenRouter(messages, modelId, isShortMode);
        }

        // 2. ОБЫЧНЫЙ HUGGING FACE
        if (modelId.startsWith('hf:')) {
            const realModel = modelId.replace('hf:', '');
            return await this.callHuggingFace(messages, realModel, isShortMode);
        }

        // 3. OPENROUTER (по умолчанию)
        return await this.callOpenRouter(messages, modelId, isShortMode);
    },

 /**
     * МЕТОД ПОИСКА через OpenRouter
     */
    async callSearchWithOpenRouter(messages, modelId, isShortMode) {
        try {
            // Извлекаем чистую модель (без префикса search:)
            const realModel = modelId.replace('search:', '');
            // Берем последний вопрос пользователя
            const userQuery = messages[messages.length - 1].content;

            console.log(`🔍 [OR Search] Ищу в Google: ${userQuery}`);
            
            // 1. Получаем контекст из Google через ваш модуль search.js (Serper)
            const webContext = await searchProvider.getContext(userQuery);

            // 2. Формируем обогащенный промпт для OpenRouter
            const enrichedMessages = [
                {
                    role: 'system',
                    content: `Ты — ассистент с доступом в интернет. Используй предоставленные данные из Google для ответа. 
                    Если в данных нет ответа, скажи об этом. Данные: ${webContext}`
                },
                { role: 'user', content: userQuery }
            ];

            // 3. Вызываем стандартный метод OpenRouter
            return await this.callOpenRouter(enrichedMessages, realModel, isShortMode);

        } catch (e) {
            console.error('❌ Ошибка поиска через OpenRouter:', e.message);
            throw e;
        }
    },


    /**
     * ВЫЗОВ HUGGING FACE
     */
    async callHuggingFace(messages, model, isShortMode) {
        try {
            const response = await hf.chatCompletion({
                model: model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                max_tokens: isShortMode ? 500 : 1500,
                temperature: 0.7,
            });

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
     * ВЫЗОВ OPENROUTER
     */
    async callOpenRouter(messages, model, isShortMode) {
        const cleanMessages = messages
            .filter(m => m && m.content && m.content.trim() !== "")
            .map(m => ({ role: m.role, content: String(m.content).trim() }));

        try {
            const response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                { model, messages: cleanMessages, max_tokens: isShortMode ? 500 : 2000 },
                {
                    headers: {
                        'Authorization': `Bearer ${config.OPENROUTER_KEY.trim()}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'Yakata Bot'
                    },
                    timeout: 45000
                }
            );
            return response;
        } catch (e) {
            throw e;
        }
    }
};

module.exports = ai;