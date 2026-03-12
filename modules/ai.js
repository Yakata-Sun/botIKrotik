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
        // 1. ЛОГИКА ПОИСКА (с использованием Hugging Face)
        if (modelId.startsWith('search:')) {
            const realModel = modelId.replace('search:', '');
            return await this.callSearchWithHF(messages, realModel, isShortMode);
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
     * МЕТОД ПОИСКА: serper Hugging Face
     */
    async callSearchWithHF(messages, model, isShortMode) {
        try {
            const userQuery = messages[messages.length - 1].content;
            console.log(`🔎 Выполняю поиск: ${userQuery}`);
 const webContext = await searchProvider.getContext(userQuery);

    const enrichedPrompt = [{
        role: 'user',
        content: `Используй данные для ответа: ${webContext}\n\nВопрос: ${userQuery}`
    }];

            // Вызываем уже готовый метод callHuggingFace
            // Передаем новый промпт вместо старой истории
            return await this.callHuggingFace(enrichedPrompt, model, isShortMode);

        } catch (e) {
            console.error('Ошибка поиска через HF:', e.message);
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