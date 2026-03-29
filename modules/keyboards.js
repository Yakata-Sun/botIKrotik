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
     * Создает стандартное меню оффера
     * @param {string} payUrl - Ссылка на оплату
     * @param {string} reserveUrl - Ссылка на бронь
     */
    offerMenu: (payUrl, reserveUrl) => {
        return Markup.inlineKeyboard([
            [Markup.button.url('🚀 Оплатить курс полностью', payUrl)],
            [Markup.button.url('🔥 Забронировать скидку', reserveUrl)],
            [Markup.button.callback('✅ Я оплатил(а)', 'confirm_payment')],
            [Markup.button.callback('📖 Отзывы', 'show_reviews')]
        ]);
    }
};