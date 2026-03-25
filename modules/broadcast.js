const storage = require('./storage');
const config = require('./config');
const { Markup } = require('telegraf');

/**
 * Модуль массовой рассылки контента.
 * @param {Object} ctx - Контекст Telegraf.
 * @param {Object} userHistory - Все пользователи из БД.
 * @param {Object} menus - Модуль клавиатур.
 * @param {Object} content - Объект { text, photo, file, url }.
 */
async function startBroadcast(ctx, userHistory, menus, content) {
    const allIds = Object.keys(userHistory);
    let success = 0;
    let failed = 0;

    await ctx.reply(`📢 Запуск рассылки на ${allIds.length} чел...`, menus.main());

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
                await ctx.telegram.sendPhoto(id, content.photo, { 
                    caption: content.text || "", 
                    ...extra 
                });
            } else if (content.file) {
                await ctx.telegram.sendDocument(id, content.file, { 
                    caption: content.text || "", 
                    ...extra 
                });
            } else {
                await ctx.telegram.sendMessage(id, content.text || "Сообщение без текста", extra);
            }
            
            success++;
            // Задержка для обхода лимитов Telegram (30 сообщений/сек)
            await new Promise(r => setTimeout(r, 50)); 
        } catch (e) {
            console.error(`Ошибка отправки пользователю ${id}:`, e.message);
            failed++;
        }
    }

    // --- БЕЗОПАСНОЕ ЛОГИРОВАНИЕ ---
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

    return ctx.reply(`✅ Рассылка завершена!\nДоставлено: ${success}\nОшибок: ${failed}`, menus.main());
}

module.exports = startBroadcast;