const config = require('./config');
const menus = require('./menus');

module.exports = (bot, userSettings) => {
    // Команда /start
    bot.start((ctx) => {
        const welcomeText = 'Доброго времени! Я умный помощник И-Кротик. Здесь Мария проводит интересные тренинги, делится своими инсайтами, и здесь вы можете пользоваться нейросетями даром';
        return ctx.reply(welcomeText, menus.main());
    });

bot.command('broadcast', async (ctx) => {
    if (ctx.from.id !== config.ADMIN_ID) return;
    
    // Включаем режим ожидания фото у админа
    userSettings[ctx.from.id].waitingForBroadcastPhoto = true;
    
    await ctx.reply('🖼 Пришлите фото для рассылки (или напишите "отмена"):', {
        reply_markup: { remove_keyboard: true }
    });
});

    // Команда /send (Рассылка)
    bot.command('send', async (ctx) => {
        if (ctx.from.id !== config.ADMIN_ID) {
            return ctx.reply('❌ У вас нет прав для этой команды.');
        }

        const messageToBroadcast = ctx.message.text.split(' ').slice(1).join(' ');
        if (!messageToBroadcast) {
            return ctx.reply('⚠️ Формат: /send Текст рассылки');
        }

        const allUserIds = Object.keys(userSettings);
        let successCount = 0;

        await ctx.reply(`📢 Рассылка на ${allUserIds.length} пользователей...`);

        for (const userId of allUserIds) {
            try {
                await bot.telegram.sendMessage(userId, messageToBroadcast, menus.main());
                successCount++;
                await new Promise(res => setTimeout(res, 50)); 
            } catch (e) {
                console.error(`Ошибка ID ${userId}:`, e.message);
            }
        }

 const logData = storage.load(config.BROADCAST_LOG) || []; // Загружаем старые логи
        logData.push({
            date: new Date().toLocaleString('ru-RU'),
            message: text,
            stats: { total: allIds.length, delivered: success, failed: errors }
        });
        storage.save(config.BROADCAST_LOG, logData); 

             await ctx.reply(`✅ Готово!\nДоставлено: ${success}\nОшибок: ${errors}\nИстория сохранена.`);
    });

    
bot.command('logs', async (ctx) => {
        if (ctx.from.id !== config.ADMIN_ID) return;

        const logs = storage.load(config.BROADCAST_LOG) || [];
        if (logs.length === 0) return ctx.reply('История рассылок пуста.');

        // Берем последние 5 рассылок
        const lastLogs = logs.slice(-5).map(l => 
            `📅 ${l.date}\n📝 "${l.message.substring(0, 30)}..." \n📊 Успешно: ${l.stats.delivered}/${l.stats.total}`
        ).join('\n\n');

        await ctx.reply(`📜 Последние рассылки:\n\n${lastLogs}`);
    });

    bot.help((ctx) => ctx.reply('Используйте кнопки меню для навигации или пишите вопросы ИИ.'));
};