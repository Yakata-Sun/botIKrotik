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
    SERPER_API_KEY: process.env.SERPER_API_KEY,
    ADMIN_ID: parseInt(process.env.ADMIN_ID),  
   SETTINGS_FILE: path.join(__dirname, '..', 'data', 'settings.json'),
    HISTORY_FILE: path.join(__dirname, '..', 'data', 'history.json'),
    BROADCAST_LOG: path.join(__dirname, '..', 'data', 'broadcasts.json'),
     QUESTIONS_FILE: path.join(__dirname, '..', 'data', 'questions.json'), 
     MAX_HISTORY_DAYS: 3,
    DEFAULT_MODEL: 'deepseek/deepseek-chat',
    MAX_HISTORY: 10,
     MODELS: {
        'Qwen 2.5 (HF)': 'hf:Qwen/Qwen2.5-72B-Instruct', 
        'GPT-os(HF)': 'hf:openai/gpt-oss-20b',
        'Llama(HF)': 'hf:meta-llama/Llama-3.1-8B-Instruct',
        'Claude': 'anthropic/claude-3-haiku',
         'Gemma 3 (OR)': 'google/gemma-3-27b-it:free',
        'Mistral 7B (Free)': 'mistralai/mistral-7b-instruct:free',
        'DeepSeek (OR)': 'deepseek/deepseek-chat',
    '🌍 Поиск в Google': 'search:Qwen/Qwen2.5-72B-Instruct' // Модель Qwen будет "думать" над результатами поиск
    },
    ASTRO_MODELS: [
        'deepseek/deepseek-chat',             // Основная (умная)
        'google/gemma-3-27b-it:free',         // Резерв 1 (новая бесплатная)
        'mistralai/mistral-7b-instruct:free'  // Резерв 2 (стабильная бесплатная)
    ]
};