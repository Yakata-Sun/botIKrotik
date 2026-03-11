const storage = require('./storage');
const config = require('./config');

/**
 * Функция массовой рассылки
 * @param {Object} ctx - Контекст Telegraf
 * @param {Object} userSettings - Объект со всеми пользователями
 * @param {Object} menus - Модуль меню
 * @param {String} text - Текст сообщения
 * @param {String|null} photoId - ID фото (если есть)
 */
async function startBroadcast(ctx, userSettings, menus, text, photoId = null) {
    const allIds = Object.keys(userSettings);
    let success = 0;
    let failed = 0;

    await ctx.reply(`📢 Запуск рассылки на ${allIds.length} чел...`, menus.main());

    for (const id of allIds) {
        try {
            if (photoId) {
                // Рассылка с ФОТО
                await ctx.telegram.sendPhoto(id, photoId, { 
                    caption: text, 
                    ...menus.main() 
                });
            } else {
                // Рассылка ТОЛЬКО ТЕКСТ
                await ctx.telegram.sendMessage(id, text, menus.main());
            }
            success++;
            // Задержка 50мс, чтобы не получить бан от Telegram (ограничение 30 сообщений в секунду)
            await new Promise(r => setTimeout(r, 50)); 
        } catch (e) {
            console.error(`Ошибка отправки пользователю ${id}:`, e.message);
            failed++;
        }
    }

    // Логируем результат
    const logData = storage.load(config.BROADCAST_LOG) || [];
    logData.push({
        date: new Date().toLocaleString('ru-RU'),
        text: text,
        hasPhoto: !!photoId,
        stats: { total: allIds.length, success, failed }
    });
    storage.save(config.BROADCAST_LOG, logData);

    return ctx.reply(`✅ Рассылка завершена!\nДоставлено: ${success}\nОшибок: ${failed}`, menus.main());
}

module.exports = startBroadcast;
