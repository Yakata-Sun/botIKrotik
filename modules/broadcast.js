const storage = require('./storage');
const config = require('./config');
const { Markup } = require('telegraf');

/**
 * Модуль массовой рассылки контента.
 * @param {Object} bot - Экземпляр Telegraf бота.
 * @param {Object} content - Объект { text, photo, file, url }.
 */
async function startBroadcast(bot, content) {
    const allUsers = storage.getAllUsers(); 
    const allIds = Object.keys(allUsers);
    console.log(`Пользователи для рассылки:`, allIds);

    let success = 0;
    let failed = 0;

    console.log(`📢 Запуск рассылки на ${allIds.length} пользователей...`);

    // Подготовка инлайн-кнопки (если есть ссылка)
    const extra = {};
    if (content.url) {
        // Если url — это массив (из extractUrl), берем первый элемент
        const finalUrl = Array.isArray(content.url) ? content.url[0] : content.url;
        
        extra.reply_markup = Markup.inlineKeyboard([
            [Markup.button.url('🔗 Перейти по ссылке', finalUrl)]
        ]).reply_markup;
    }

    // Цикл рассылки по всем пользователям
    for (const id of allIds) {
        try {
            if (content.photo) {
                await bot.telegram.sendPhoto(id, content.photo, { 
                    caption: content.text || "", 
                    ...extra 
                });
            } else if (content.file) {
                await bot.telegram.sendDocument(id, content.file, { 
                    caption: content.text || "", 
                    ...extra 
                });
            } else {
                await bot.telegram.sendMessage(id, content.text || "Сообщение без текста", extra);
            }
            
            success++;
            // Задержка для обхода лимитов Telegram (30 сообщений/сек)
            await new Promise(r => setTimeout(r, 50)); 
        } catch (e) {
            console.error(`Ошибка отправки пользователю ${id}:`, e.message);
            failed++;
        }
    }

    // --- ЛОГИРОВАНИЕ ---
    let logData = storage.load(config.BROADCAST_LOG);
    
    // Проверка: если лог не массив (null, {} или пустой файл), создаем новый массив
    if (!Array.isArray(logData)) {
        logData = [];
    }

    logData.push({
        date: new Date().toLocaleString('ru-RU'),
        text: content.text || "Без текста",
        type: content.photo ? 'photo' : (content.file ? 'document' : 'text'),
        stats: { total: allIds.length, success, failed }
    });

    storage.save(config.BROADCAST_LOG, logData);

    console.log(`✅ Рассылка завершена! Доставлено: ${success}, Ошибок: ${failed}`);
    
    // Возвращаем результат для возможного использования
    return { success, failed, total: allIds.length };
}

module.exports = startBroadcast;