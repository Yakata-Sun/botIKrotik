/**
 * @module Commands
 * @description Регистрация команд бота (/start, /broadcast, /search, /logs).
 */

const config = require('./config');
const menus = require('./menus');
const storage = require('./storage');
const ai = require('./ai'); // Добавили импорт для работы /search

module.exports = (bot, userSettings, userHistory) => {
    
    /**
     * Команда /start - Приветствие и инициализация меню
     */
    bot.command("start", async (ctx) => {
        const userId = ctx.from.id;
        const isAdmin = String(userId) === String(config.ADMIN_ID);

        // 1. Инициализация настроек
        if (!userSettings[userId]) {
            userSettings[userId] = { 
                selectedModel: config.DEFAULT_MODEL, 
                mode: 'short',
                isAstroCheck: false 
            };
        }

        // 2. Принудительный сброс всех флагов
        const settings = userSettings[userId];
        settings.waitingForBroadcastPhoto = false;
        settings.waitingForBroadcastText = false;
        settings.waitingForConfirm = false;
        settings.isAstroCheck = false;
        
        storage.save(config.SETTINGS_FILE, userSettings);

        // 3. Подсчет пользователей (из переданного userHistory)
        const count = Object.keys(userHistory || {}).length;

        const welcomeText = 'Доброго времени! Я умный помощник И-Кротик. ✨\n\n' +
            'Здесь можно увидеть услуги по коучингу (экспресс-сессия, курс-путешествие, астро-чекап) и разработке (создание чат-ботов и веб-разработка) от Марии.\n\n' + 'В недрах этого бота можно найти в подарок интересные гайды и тренинги, а иногда Мария публикует здесь новые или делиться инсайтами';

        // Передаем isAdmin и count в меню
        return await ctx.reply(welcomeText, menus.main(isAdmin, count));
    });

    /**
     * Команда /broadcast - Запуск конструктора рассылки
     */
    bot.command('broadcast', async (ctx) => {
        if (String(ctx.from.id) !== String(config.ADMIN_ID)) return;
        
        const userId = ctx.from.id;
        if (!userSettings[userId]) userSettings[userId] = {};

        userSettings[userId].waitingForBroadcastPhoto = true;
        storage.save(config.SETTINGS_FILE, userSettings);
        
        await ctx.reply('📢 Режим создания рассылки активирован.\n\nПришлите ФОТО, PDF-ФАЙЛ или просто ТЕКСТ сообщения:', {
            reply_markup: { 
                keyboard: [[{ text: '❌ Отмена' }]], 
                resize_keyboard: true 
            }
        });
    });

    /**
     * Команда /search - Личный поиск Админа
     */
    bot.command('search', async (ctx) => {
        const userId = ctx.from.id;
        if (String(userId) !== String(config.ADMIN_ID)) return;

        const query = ctx.message.text.replace('/search', '').trim();
        
        if (!query) {
            return await ctx.reply("🔎 Напишите запрос, например: <code>/search тренды 2026</code>", { parse_mode: 'HTML' });
        }

        await ctx.sendChatAction('typing');
        try {
            const searchModel = "search:" + config.DEFAULT_MODEL; 
            const response = await ai.getAIResponse([{ role: 'user', content: query }], searchModel, false);
            
            // Исправлено обращение к результату
            const answer = response.data.choices[0].message.content;
            await ctx.reply(`<b>Результат поиска:</b>\n\n${answer}`, { parse_mode: 'HTML' });
        } catch (e) {
            console.error('Ошибка /search:', e.message);
            await ctx.reply("❌ Ошибка поиска.");
        }
    });

    /**
     * Команда /logs - История рассылок
     */
    bot.command('logs', async (ctx) => {
        if (String(ctx.from.id) !== String(config.ADMIN_ID)) return;
        
        try {
            const logs = storage.load(config.BROADCAST_LOG);
            if (!Array.isArray(logs) || logs.length === 0) {
                return await ctx.reply('История рассылок пуста.');
            }

            const lastLogs = logs.slice(-5).map(l => {
                const date = l.date || 'Нет даты';
                const preview = l.text ? l.text.substring(0, 30) : 'Медиа-рассылка';
                const delivered = l.stats?.success ?? 0;
                const total = l.stats?.total ?? 0;
                return `📅 ${date}\n📝 "${preview}..." \n📊 Успешно: ${delivered}/${total}`;
            }).join('\n\n');

            await ctx.reply(`📜 Последние рассылки:\n\n${lastLogs}`);
        } catch (e) {
            await ctx.reply('⚠️ Ошибка при чтении логов.');
        }
    });

    bot.help((ctx) => ctx.reply('Используйте кнопки меню для навигации. ✨'));
};