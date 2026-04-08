const { Markup } = require('telegraf');

const MAP_PATH_SESSION_TEXT = `📍 <b>Сессия «Карта Пути»</b> — это точка сборки твоего пути.\n\n` +
    `Всего за одну глубокую встречу с использованием МАК-карт мы:\n` +
    `• Разберем твой запрос "по косточкам"\n` +
    `• Найдем скрытые препятствия, которые не видны изнутри\n` +
    `• Составим план из 3-х конкретных шагов к твоей цели\n\n` +
    `Это формат для тех, кто ценит время и хочет получить **ясность за 60 минут**.\n\n` +
    `Готов составить свою карту?`;

const sendMapPathSession = async (ctx) => {
    return await ctx.reply(MAP_PATH_SESSION_TEXT, { 
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🚀  Да, я хочу на сессию!', 'order_map-kouch')],
            [Markup.button.url('✉️ Обсудить в ЛС', 'https://t.me/sherab_wangmo')]
        ])
    });
};

module.exports = {
    MAP_PATH_SESSION_TEXT,
    sendMapPathSession
};