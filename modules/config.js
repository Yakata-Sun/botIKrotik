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
        'Qwen 3.5(HF)': 'hf:Qwen/Qwen3.5-27B',
        'GPT-os(HF)': 'hf:openai/gpt-oss-20b',
        'Llama(HF)': 'hf:meta-llama/Llama-3.1-8B-Instruct',
        'DeepSeek (OR)': 'deepseek/deepseek-chat',
    '🌍 Поиск в Google': 'search:Qwen/Qwen2.5-72B-Instruct' // Модель Qwen будет "думать" над результатами поиск
    },
    // Добавьте это в module.exports вашего config.js
FUNNEL: {
    STEP_1_TEXT: "✨ Представьте, что у вас есть волшебный ключ к вашему внутреннему миру...", // Ваш текст из описания
    GIFT_URL: "https://t.me", // Ссылка на пост с подарком (медитацией)
    MAC_CARDS: [
        { id: 1, text: "Карта 1: Вы на пороге открытий. Ваше подсознание шепчет...", img: "url_to_image_1" },
        { id: 2, text: "Карта 2: Дракон на пути — это лишь ваша тень. Пора...", img: "url_to_image_2" },
        { id: 3, text: "Карта 3: Золотая нить ведет вас к истинному Я...", img: "url_to_image_3" }
    ]
}
};