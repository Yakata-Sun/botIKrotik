const { Markup } = require('telegraf');
const config = require('./config');

/**
 * @module Actions
 * @description Регистрация всех callback-обработчиков бота
 */
module.exports = (bot, { userSettings, astro, funnel, storage, config }) => {

    // --- 1. ОБРАБОТКА ЗАЯВОК (ORDER) ---
    bot.action(/^order_(.+)$/, async (ctx) => {
        const serviceType = ctx.match[1];
        const user = ctx.from;

        const report = `🔔 <b>НОВАЯ ЗАЯВКА!</b>\n\n` +
                       `📦 Услуга: <code>${serviceType}</code>\n` +
                       `👤 Клиент: <a href="tg://user?id=${user.id}">${user.first_name}</a> (@${user.username || 'нет'})\n` +
                       `🆔 ID: <code>${user.id}</code>`;

        await ctx.telegram.sendMessage(config.ADMIN_ID, report, { parse_mode: 'HTML' });
        await ctx.answerCbQuery();
        await ctx.reply("✨ Спасибо! Ваша заявка получена. Мария свяжется с вами в ближайшее время.");
    });

    // --- 2. БА ЦЗЫ: ВЫБОР ЦЕЛИ ---
    bot.action(/^goal_(.+)$/, async (ctx) => {
        const goalId = ctx.match[1];
        const goalMap = {
            'scattered': 'Разбрасываюсь, берусь то за одно, то за другое',
            'fear': 'Боюсь начать / Сомневаюсь в себе',
            'mission': 'Ищу свое предназначение',
            'lost': 'Я потерялся, чувствую неопределенность', 
            'no_energy': 'У меня нет ресурсов и сил', 
            'growth': 'Хочу масштаб и рост'
        };

        // Вызываем ИИ-анализ из модуля astro
        await astro.processAI(ctx, userSettings, goalMap[goalId]);
    });

    // --- 3. МИНИ-ВОРОНКА: БЫСТРЫЙ КОУЧИНГ ---
    bot.action('fast_coaching_start', async (ctx) => {
        await ctx.answerCbQuery();
        const checklistId = config.CHECKLIST_FILE_ID; // Лучше хранить в конфиге

        await ctx.reply(
            "💪 Отличный выбор! Первый шаг к решению — это честный взгляд на ситуацию.\n\n" +
            "Ловите чек-лист для самодиагностики.",
            { parse_mode: 'HTML' }
        );

        await ctx.replyWithDocument(checklistId, {
            caption: "📋 Чек-лист «Самодиагностика запроса»",
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.url('📅 Забронировать сессию', config.CONTACT_URL)]
            ]).reply_markup
        });
    });

    // --- 4. ИНИЦИАЛИЗАЦИЯ ВОРОНКИ СКАЗКИ ---
    // Передаем зависимости внутрь модуля воронки
    funnel.init(bot, userSettings);

};