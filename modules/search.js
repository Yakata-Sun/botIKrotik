const axios = require('axios');
const config = require('./config');

/**
 * @module Search
 * @description Модуль для выполнения поиска в интернете через Serper (Google API).
 */
const searchProvider = {
    /**
     * Выполняет поиск и возвращает краткий контекст.
     * @async
     * @param {string} query - Поисковый запрос.
     * @returns {Promise<string>} Строка с результатами поиска (заголовки и сниппеты).
     */
    async getContext(query) {
        try {
            console.log(`🔎 Выполняю поиск в Google: ${query}`);
            
            const response = await axios.post('https://google.serper.dev/search', 
                { 
                    q: query, 
                    gl: 'ru', 
                    hl: 'ru' 
                }, 
                { 
                    headers: { 
                        'X-API-KEY': config.SERPER_API_KEY, // Проверьте, что в config.js это имя совпадает!
                        'Content-Type': 'application/json' 
                    }
                }
            );

            // Безопасно извлекаем данные
            if (response.data && response.data.organic) {
                return response.data.organic
                    .slice(0, 4)
                    .map(r => `🔹 ${r.title}\n${r.snippet}`)
                    .join('\n\n');
            }
            
            return "Результаты в Google не найдены.";
        } catch (e) {
            // Выводим детальную ошибку, чтобы понять причину 405
            console.error('Детали ошибки Serper:', e.response?.data || e.message);
            return "Не удалось получить данные из интернета.";
        }
    }
};

module.exports = searchProvider;