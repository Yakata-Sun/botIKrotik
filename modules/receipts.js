/**
 * @module Receipts
 * @description Обработка чеков от пользователей (только когда ожидается чек)
 */

const config = require('./config');
const storage = require('./storage');

/**
 * Основная функция обработки чека
 * @param {import('telegraf').Context} ctx - Контекст Telegraf
 */
async function handleReceipt(ctx) {
  try {
    let fileId;
    let fileType;
    
    // Определяем тип файла
    if (ctx.message.photo) {
      fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      fileType = 'photo';
    } else if (ctx.message.document) {
      fileId = ctx.message.document.file_id;
      fileType = 'document';
    }

    if (!fileId) {
      await ctx.reply("Не удалось получить файл чека. Попробуйте отправить заново.");
      return;
    }

    const adminId = config.ADMIN_ID;
    const userInfo = `Чек от пользователя: ${ctx.from.first_name} (@${ctx.from.username || ctx.from.id})`;
    
    // Отправляем чек админу
    if (fileType === 'photo') {
      await ctx.telegram.sendPhoto(adminId, fileId, {
        caption: `${userInfo}\n\n📸 Получен чек (фото)`
      });
    } else {
      await ctx.telegram.sendDocument(adminId, fileId, {
        caption: `${userInfo}\n\n📎 Получен чек (документ)`
      });
    }

    // Подтверждение пользователю
    await ctx.reply("✅ Спасибо! Ваш чек успешно принят и передан администратору для проверки.");

    // Сбрасываем флаг ожидания чека
    const userId = ctx.from.id;
    await storage.updateUserSetting(userId, { 
      awaitingReceipt: false,
      paymentStep: 'receipt_received'
    });

  } catch (error) {
    console.error('Ошибка при обработке чека:', error);
    await ctx.reply("Произошла ошибка при обработке чека. Попробуйте позже или свяжитесь с администратором.");
  }
}

/**
 * Регистрирует обработчики чеков в боте (только когда ожидается чек)
 * @param {Telegraf} bot - Экземпляр бота
 */
function registerReceiptHandlers(bot) {
  // Обработка фото - только когда ожидается чек
  bot.on('photo', async (ctx, next) => {
    const userId = ctx.from.id;
    const settings = storage.getUserSettings(userId);
    
    // Проверяем только флаг awaitingReceipt
    if (settings.awaitingReceipt === true) {
      console.log(`[Receipts] Processing photo receipt for user ${userId}`);
      await handleReceipt(ctx);
    } else {
      console.log(`[Receipts] Not awaiting receipt from user ${userId}, passing to next handler`);
      return next(); // Передаем обработку следующим обработчикам
    }
  });

  // Обработка документов - только когда ожидается чек
  bot.on('document', async (ctx, next) => {
    const userId = ctx.from.id;
    const settings = storage.getUserSettings(userId);
    
    // Проверяем только флаг awaitingReceipt
    if (settings.awaitingReceipt === true) {
      console.log(`[Receipts] Processing document receipt for user ${userId}`);
      await handleReceipt(ctx);
    } else {
      console.log(`[Receipts] Not awaiting receipt from user ${userId}, passing to next handler`);
      return next(); // Передаем обработку следующим обработчикам
    }
  });
}

module.exports = {
  registerReceiptHandlers
};