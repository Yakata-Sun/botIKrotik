require('dotenv').config();
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
    HF_TOKEN: process.env.HF_TOKEN,
    ADMIN_ID: parseInt(process.env.ADMIN_ID),  
   SETTINGS_FILE: path.join(__dirname, '..', 'data', 'settings.json'),
    HISTORY_FILE: path.join(__dirname, '..', 'data', 'history.json'),
    BROADCAST_LOG: path.join(__dirname, '..', 'data', 'broadcasts.json'),
     MAX_HISTORY_DAYS: 3,
    DEFAULT_MODEL: 'qwen/qwen-2.5-72b-instruct',
    MAX_HISTORY: 10,
     MODELS: {
        'Qwen 3.5(HF)': 'hf:Qwen/Qwen3.5-27B',
        'Qwen 2.5(OR)': 'qwen/qwen-2.5-72b-instruct',
        'Llama(HF)': 'hf:meta-llama/Llama-3.1-8B-Instruct',
        'Gemma': 'google/gemma-2-9b-it:free'
    }
};