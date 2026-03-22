/**
 * @module Utils
 * @description Вспомогательные инструменты для разработки, парсинга и отладки.
 */
const config = require('./config');

/**
 * Извлекает первую найденную URL-ссылку из текста.
 * @param {string} text - Текст для поиска.
 * @returns {string|null} - Ссылка или null.
 */
function extractUrl(text) {
    if (!text || typeof text !== 'string') return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? matches[0] : null; 
}

/**
 * Отслеживает и выводит в чат File ID медиафайлов для администратора.
 * Полезно для настройки воронки и получения ID фото/документов.
 * @param {Object} ctx - Контекст Telegraf.
 * @returns {Promise<boolean>} - True, если файл был обработан и выполнение нужно прервать.
 */
async function trackFileIds(ctx) {
    const userId = ctx.from?.id;
    
    // Проверка прав администратора
    if (userId !== config.ADMIN_ID) return false;

    // Обработка фотографий
    if (ctx.message?.photo) {
        const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        await ctx.reply(`🖼 <b>ID Фото:</b>\n<code>${fileId}</code>`, { parse_mode: 'HTML' });
        return true;
    }

    // Обработка документов (PDF, презентации)
    if (ctx.message?.document) {
        const docId = ctx.message.document.file_id;
        const fileName = ctx.message.document.file_name;
        await ctx.reply(`📄 <b>ID Документа (${fileName}):</b>\n<code>${docId}</code>`, { parse_mode: 'HTML' });
        return true;
    }

    return false;
}

module.exports = { 
    extractUrl, 
    trackFileIds 
};