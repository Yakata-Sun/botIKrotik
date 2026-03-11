const axios = require('axios');
const config = require('./config');

async function getAIResponse(messages, model, isShort = false) {
  // Определяем системную инструкцию в зависимости от режима
  const systemInstruction = isShort 
    ? "ОТВЕЧАЙ МАКСИМАЛЬНО КРАТКО (1-2 предложения). БЕЗ приветствий." 
    : "Давай подробный и развернутый ответ.";

  // Вставляем инструкцию в начало массива сообщений
  const finalMessages = [
    { role: 'system', content: systemInstruction },
    ...messages
  ];

  return await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { 
      model: model, 
      messages: finalMessages,
      // ГЛАВНОЕ ДЛЯ СКОРОСТИ:
      max_tokens: isShort ? 250 : 10000, 
      temperature: isShort ? 0.4 : 0.7 
    },
    {
      headers: { 
        'Authorization': `Bearer ${config.OPENROUTER_KEY}`, 
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'My Telegram Bot'
      },
      timeout: 45000 // Тайм-аут 45 секунд, чтобы бот не висел вечно
    }
  );
}

module.exports = { getAIResponse };