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
        
         // 3. ДОБАВЛЯЕМ ЛОГИКУ ЧЕК-ЛИСТА (если это сессия "Карта Пути")
    if (serviceType === 'map-kouch') {
        const checklistId = config.CHECKLIST_FILE_ID; 

        // Небольшая пауза для естественности (опционально)
        setTimeout(async () => {
            await ctx.reply(
                "💪 Отличный выбор! Твоя заявка принята, в ближайшее время Мария выйдет на связь\n\n",
                { parse_mode: 'HTML' }
            );

 setTimeout(async () => {
            const practiceText = 
                `А пока могу предложить тебе пройти короткую интерактивную \n\n` +
                `практику <b>«Разгрузка рюкзака»</b> — она поможет убрать лишний шум и почувствовать легкость еще до начала сессии.\n\n` +
                `Хочешь сделать этот первый шаг прямо сейчас?`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback("✅ Да, давай разгрузим", "start_backpack_practice")],
                [Markup.button.callback("⏳ Нет, дождусь сессии", "skip_backpack_practice")],
                [Markup.button.url('✉️ Написать Марии лично', 'https://t.me/sherab_wangmo')]
            ]);

            await ctx.reply(practiceText, { 
                parse_mode: 'HTML', 
                ...keyboard 
            });
        }, 3000); 
        }, 1000); 
    } else {
        await ctx.reply("✨ Спасибо! Ваша заявка получена. Мария свяжется с вами в ближайшее время.");
    }
});
// Начало практики (через 1.5 секунды после нажатия "Да")
bot.action('start_backpack_practice', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText("⏳ <i>Раскрываю рюкзак...</i>", { parse_mode: 'HTML' });

    setTimeout(async () => {
        const text = `🎒 <b>Практика «Разгрузка рюкзака»</b>\n\n` +
            `Представь, что твои дела и тревоги — это тяжелые камни в рюкзаке. ` +
            `Давай выложим первый самый крупный камень. Какое чувство сейчас весит больше всего?`;
        
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback("🪨 Чужое ожидание", "backpack_finish")],
            [Markup.button.callback("🪨 Страх ошибки", "backpack_finish")],
            [Markup.button.callback("🪨 Лишняя суета", "backpack_finish")]
        ]);

        await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard });
    }, 1500);
});

// Финал с Компасом (многоступенчатая пауза)
bot.action('backpack_finish', async (ctx) => {
    await ctx.answerCbQuery();
    
    // Сразу меняем текст
    await ctx.editMessageText("✨ Ты медленно выкладываешь этот камень на обочину...");

    // Через 2.5 секунды — ощущение легкости
    setTimeout(async () => {
        await ctx.reply("🧘 <i>В теле появляется первый глоток легкости. Туман в голове начинает рассеиваться...</i>", { parse_mode: 'HTML' });

        // Через еще 3 секунды — финальный подарок (Компас)
        setTimeout(async () => {
            const finalText = `🏮 <b>Твой путь уже начался.</b>\n\n` +
                `Чтобы закрепить это состояние до нашей встречи, я дарю тебе <b>Компас Приоритетов</b>. Сохрани его себе.`;

            await ctx.replyWithPhoto(config.COMPASS_PHOTO_ID, {
                caption: finalText,
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.url('✉️ Написать Марии', 'https://t.me/sherab_wangmo')]
                ])
            });
        }, 3000);

    }, 2500);
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

    // --- 4. ИНИЦИАЛИЗАЦИЯ ВОРОНКИ СКАЗКИ ---
    // Передаем зависимости внутрь модуля воронки
    funnel.init(bot, userSettings);

};