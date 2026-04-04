const { Markup } = require('telegraf');

module.exports = {
    /**
     * Создает сетку кнопок для выбора МАК-карт (3 в ряд)
     * @param {string} prefix - Префикс для callback_data (напр. 'loc' или 'shd')
     * @param {number} count - Количество кнопок (по умолчанию 9)
     */
    makeGrid: (prefix, count = 9) => {
        const buttons = [];
        for (let i = 1; i <= count; i++) {
            buttons.push(Markup.button.callback(`${i}`, `${prefix}_${i}`));
        }
        // Группируем по 3 кнопки в ряд
        const rows = [];
        while (buttons.length) rows.push(buttons.splice(0, 3));
        return Markup.inlineKeyboard(rows);
    },
/**
     * Меню детальных цен
     * @param {string} reserveUrl - Ссылка на бронь
     */
    pricesMenu: (payUrl) => {
        return Markup.inlineKeyboard([
            [Markup.button.url('🔥 Забронировать место', payUrl)],
            [Markup.button.callback('⬅️ Вернуться', 'show_offer')]
        ]);
    },
    /**
     * Создает стандартное меню оффера
     * @param {string} payUrl - Ссылка на оплату
     * @param {string} reserveUrl - Ссылка на бронь
     */
    offerMenu: (reservePrice, payUrl) => {
        return Markup.inlineKeyboard([
            [Markup.button.callback("💰 Посмотреть все форматы и цены", "show_prices")],
            [Markup.button.url(`🔥 Забронировать (${reservePrice})`, payUrl)],
            [Markup.button.callback("✅ Я оплатил(а)", "confirm_payment")],
            [Markup.button.callback("📖 Отзывы", "show_reviews")],
            [Markup.button.callback("💬 Связаться", "contact_admin")]
        ]);
    }
};