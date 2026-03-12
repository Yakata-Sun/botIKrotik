const storage = require('./storage');
const config = require('./config');
const { Markup } = require('telegraf'); // Добавляем для кнопок

/**
 * @param {Object} ctx 
 * @param {Object} userSettings 
 * @param {Object} menus 
 * @param {Object} content - { text, photo, file, url }
 */
async function startBroadcast(ctx, userSettings, menus, content) {
    const allIds = Object.keys(userSettings);
    let success = 0;
    let failed = 0;

    await ctx.reply(`📢 Запуск рассылки на ${allIds.length} чел...`, menus.main());

    // Создаем инлайн-кнопку, если в тексте или настройках есть ссылка
    // (Или если вы передали url отдельно)
    const extra = {};
    if (content.url) {
        extra.reply_markup = Markup.inlineKeyboard([
            [Markup.button.url('🔗 Перейти на сайт', content.url)]
        ]).reply_markup;
    }

    for (const id of allIds) {
        try {
            if (content.photo) {
                // Рассылка ФОТО + ТЕКСТ
                await ctx.telegram.sendPhoto(id, content.photo, { 
                    caption: content.text, 
                    ...extra 
                });
            } else if (content.file) {
                // Рассылка PDF/ДОКУМЕНТ + ТЕКСТ
                await ctx.telegram.sendDocument(id, content.file, { 
                    caption: content.text, 
                    ...extra 
                });
            } else {
                // Рассылка ТОЛЬКО ТЕКСТ
                await ctx.telegram.sendMessage(id, content.text, extra);
            }
            
            success++;
            // Пауза 50мс для соблюдения лимитов Telegram
            await new Promise(r => setTimeout(r, 50)); 
        } catch (e) {
            // Если пользователь заблокировал бота, удалять его из базы не будем, но в лог запишем
            console.error(`Ошибка отправки пользователю ${id}:`, e.message);
            failed++;
        }
    }

    // Логируем результат
    const logData = storage.load(config.BROADCAST_LOG) || [];
    logData.push({
        date: new Date().toLocaleString('ru-RU'),
        text: content.text,
        type: content.photo ? 'photo' : (content.file ? 'document' : 'text'),
        stats: { total: allIds.length, success, failed }
    });
    storage.save(config.BROADCAST_LOG, logData);

    return ctx.reply(`✅ Рассылка завершена!\nДоставлено: ${success}\nОшибок: ${failed}`, menus.main());
}

module.exports = startBroadcast;