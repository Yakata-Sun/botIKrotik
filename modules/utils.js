/**
 * Извлекает первую найденную URL-ссылку из текста.
 * @param {string} text - Текст для поиска.
 * @returns {string|null} - Ссылка или null.
 */
function extractUrl(text) {
    // Если текста нет (прислали только файл), возвращаем null
    if (!text || typeof text !== 'string') return null;
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? matches[0] : null; 
}

module.exports = { extractUrl };