/**
 * @module Commands
 * @description Регистрация команд бота (/start, /broadcast, /logs).
 */

const config = require('./config');
const menus = require('./menus');
const storage = require('./storage');

module.exports = (bot, userSettings) => {
    
    /**
     * Команда /start - Приветствие и инициализация меню
     */
    bot.start((ctx) => {
        const welcomeText = 'Доброго времени! Я умный помощник И-Кротик. Здесь Мария проводит интересные тренинги, делится инсайтами, и здесь вы можете пользоваться нейросетями даром.';
        return ctx.reply(welcomeText, menus.main());
    });

    /**
     * Команда /broadcast - Запуск пошагового конструктора рассылки
     */
    bot.command('broadcast', async (ctx) => {
        // Проверка прав администратора
        if (ctx.from.id !== Number(config.ADMIN_ID)) return;
        
        const userId = ctx.from.id;

        // Инициализируем настройки, если их нет
        if (!userSettings[userId]) userSettings[userId] = {};

        // Включаем первый шаг стейт-машины в broadcastHandler.js
        userSettings[userId].waitingForBroadcastPhoto = true;
        
        await ctx.reply('📢 Режим создания рассылки активирован.\n\nПришлите ФОТО, PDF-ФАЙЛ или просто ТЕКСТ сообщения:', {
            reply_markup: { 
                keyboard: [[{ text: '❌ Отмена' }]], 
                resize_keyboard: true 
            }
        });
    });

    /**
     * Команда /logs - Просмотр истории рассылок
     */
    bot.command('logs', async (ctx) => {
        try {
            // Проверка прав (приводим к числу для надежности)
            if (ctx.from.id !== Number(config.ADMIN_ID)) return;

            const logs = storage.load(config.BROADCAST_LOG);
            
            // Проверка: если логов нет или это не массив
            if (!Array.isArray(logs) || logs.length === 0) {
                return await ctx.reply('История рассылок пуста.');
            }

            // Формируем отчет по последним 5 записям
            const lastLogs = logs.slice(-5).map(l => {
                // Безопасное получение данных (защита от старых или битых записей)
                const date = l.date || 'Нет даты';
                const preview = l.text ? l.text.substring(0, 30) : (l.type === 'photo' ? 'Фото-рассылка' : 'Файл/Документ');
                
                // Проверяем наличие объекта stats, чтобы не упасть на l.stats.success
                const delivered = l.stats?.success ?? 0;
                const total = l.stats?.total ?? 0;

                return `📅 ${date}\n📝 "${preview}..." \n📊 Успешно: ${delivered}/${total}`;
            }).join('\n\n');

            await ctx.reply(`📜 Последние рассылки:\n\n${lastLogs}`);
        } catch (e) {
            console.error('Ошибка в команде /logs:', e.message);
            await ctx.reply('⚠️ Произошла ошибка при чтении логов. Возможно, файл поврежден.');
        }
    });

    /**
     * Команда /help - Справочная информация
     */
    bot.help((ctx) => ctx.reply('Используйте кнопки меню для навигации или просто пишите вопросы для ИИ.'));
};