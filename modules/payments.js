/**
 * @module Payments
 * @description Утилита для работы с ручной оплатой и бронированием цен
 */

const { Markup } = require('telegraf');
const storage = require('./storage');

/**
 * Создает стандартное сообщение с инструкцией по оплате
 * @param {string} title - Заголовок сообщения
 * @param {string} paymentType - Тип оплаты для отображения
 * @returns {string} Форматированное сообщение с инструкцией по оплате
 * @private
 */
function createPaymentMessage(title, paymentType) {
  return `✅ <b>${title}</b>\n\n` +
    `💳 Для ${paymentType} переведите средства:\n` +
    '- По номеру карты: `4276 3020 0238 4419`\n' +
    '- Или через перевод на телефон: `+7 (953) 093-74-93`\n\n' +
    '- Если хотите использовать другие системы оплаты, напишите Марии напрямую: @sherab_wangmo\n\n' +
    '📩 После оплаты нажмите кнопку "✅ Я оплатил(а)" и пришлите скриншот чека прямо в этот чат.';
}

/**
 * Обработчик бронирования цены (депозит 1000р)
 * @param {import('telegraf').Context} ctx - Контекст Telegraf
 * @description Сохраняет состояние бронирования и отправляет инструкцию по оплате депозита с кнопкой подтверждения
 */
exports.handleReservePrice = async (ctx) => {
  await ctx.answerCbQuery();
  
  const userId = ctx.from.id;
  
  // Сохраняем состояние бронирования депозита
  await storage.updateUserSetting(userId, { 
    reserved: true,
    reservedAt: Date.now(),
    reserveType: 'deposit'
  });

  const message = createPaymentMessage(
    'Ваша цена успешно зарезервирована!',
    'оплаты депозита 1000р'
  );

  // Создаем клавиатуру с кнопкой перехода к отправке чека
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("✅ Я оплатил(а)", "i_paid")]
  ]);

  await ctx.reply(message, { 
    parse_mode: 'HTML',
    ...keyboard
  });
};

/**
 * Обработчик подтверждения полной оплаты
 * @param {import('telegraf').Context} ctx - Контекст Telegraf
 * @description Сохраняет состояние полной оплаты и отправляет инструкцию по оплате курса с кнопкой подтверждения
 */
exports.handleFullPayment = async (ctx) => {
  await ctx.answerCbQuery();
  
  const userId = ctx.from.id;
  
  // Сохраняем состояние полной оплаты
  await storage.updateUserSetting(userId, { 
    fullPaymentStarted: true,
    fullPaymentAt: Date.now(),
    paymentType: 'full'
  });

  const message = createPaymentMessage(
    'Готовы к оплате курса!',
    'полной оплаты'
  );

  // Создаем клавиатуру с кнопкой перехода к отправке чека
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("✅ Я оплатил(а)", "i_paid")]
  ]);

  await ctx.reply(message, { 
    parse_mode: 'HTML',
    ...keyboard
  });
};

/**
 * Получает текущий статус оплаты пользователя
 * @param {number|string} userId - ID пользователя Telegram
 * @returns {Promise<Object>} Объект с информацией о состоянии оплаты пользователя
 * @description Возвращает полное состояние пользователя или пустой объект, если пользователь не найден
 */
exports.getUserPaymentStatus = async (userId) => {
  const userState = await storage.getUserState(userId);
  return userState || {};
};