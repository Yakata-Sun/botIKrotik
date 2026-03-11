const path = require('path');

/**
 * @module Config
 * @description Централизованное хранилище настроек бота, путей к файлам и моделей ИИ.
 * @property {string} BOT_TOKEN - Токен бота от BotFather.
 * @property {number} ADMIN_ID - Telegram ID администратора для рассылок.
 * @property {Object} MODELS - Словарь доступных моделей (Кнопка -> ID модели API).
 */

module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    OPENROUTER_KEY: process.env.OPENROUTER_KEY,
    ADMIN_ID: process.env.ADMIN_ID,
    BROADCAST_LOG: './data/broadcasts.json',  
    SETTINGS_FILE: path.join(__dirname, 'settings.json'),
    HISTORY_FILE: path.join(__dirname, 'history.json'),
     MAX_HISTORY_DAYS: 3,
    DEFAULT_MODEL: 'deepseek/deepseek-chat:free',
    MAX_HISTORY: 10,
     MODELS: {
        'DeepSeek': 'deepseek/deepseek-chat:free',
        'MistralNemo': 'mistralai/mistral-nemo',
        'Qwen': 'qwen/qwen-2.5-72b-instruct',
        'Llama': 'meta-llama/llama-3.3-70b-instruct',
        'Gemma': 'google/gemma-2-27b-it',
        'llama (поиск в интернете)': 'perplexity/llama-3.1-sonar-small-128k-online:free'
    }
};