/**
 * @module Utils
 * @description Вспомогательные инструменты для разработки, парсинга, отладки и отправки медиа.
 */
const config = require('./config');
const storage = require('./storage');
const fs = require('fs');
const schedule = require('node-schedule');

/**
 * Извлекает первую найденную URL-ссылку из текста.
 */
function extractUrl(text) {
    if (!text || typeof text !== 'string') return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? matches[0] : null; 
}

/**
 * Отслеживает и сохраняет ID медиафайлов (только для админа, вне режима рассылки)
 * @param {import('telegraf').Context} ctx - Контекст Telegraf
 * @returns {Promise<boolean>} true если файл был обработан, false если нужно продолжить обычную обработку
 */
async function trackFileIds(ctx) {
    const userId = ctx.from?.id;
    
    // Только для админа
    if (userId != config.ADMIN_ID) {  // Используем != чтобы избежать проблем с типами
        return false;
    }
    
    // Проверяем, находится ли админ в режиме рассылки
    const userSettings = storage.load(config.SETTINGS_FILE);
    const adminSettings = userSettings[userId] || {};
    const isAdminInBroadcastMode = adminSettings.waitingForBroadcastPhoto || 
                                 adminSettings.waitingForBroadcastText ||
                                 adminSettings.waitingForConfirm;
    
    // Если в режиме рассылки - не отслеживаем ID файлов
    if (isAdminInBroadcastMode) {
        return false;
    }
    
    // Отслеживаем ID файлов только если НЕ в режиме рассылки
    // Проверяем все возможные поля для фото
    if (ctx.message?.photo) {
        const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        await ctx.reply(`🖼 <b>ID Фото:</b>\n<code>${fileId}</code>`, { parse_mode: 'HTML' });
        return true;
    }
    
    // Проверяем document
    if (ctx.message?.document) {
        const docId = ctx.message.document.file_id;
        const fileName = ctx.message.document.file_name;
        await ctx.reply(`📄 <b>ID Документа (${fileName}):</b>\n<code>${docId}</code>`, { parse_mode: 'HTML' });
        return true;
    }
    
    // Проверяем sticker
    if (ctx.message?.sticker) {
        const stickerId = ctx.message.sticker.file_id;
        await ctx.reply(`張貼 <b>ID Стикер:</b>\n<code>${stickerId}</code>`, { parse_mode: 'HTML' });
        return true;
    }
    
    // Проверяем voice
    if (ctx.message?.voice) {
        const voiceId = ctx.message.voice.file_id;
        await ctx.reply(`🎤 <b>ID Голосовое сообщение:</b>\n<code>${voiceId}</code>`, { parse_mode: 'HTML' });
        return true;
    }
    
    return false;
}

/**
 * Универсальная отправка PDF-документа.
 * Поддерживает как Telegram File ID, так и локальные пути.
 * @param {Object} ctx - Контекст Telegraf.
 * @param {string} fileSource - File ID или путь к файлу (напр. './assets/file.pdf').
 * @param {string} caption - Подпись к документу.
 */
async function sendPDF(ctx, fileSource, caption) {
    try {
        // Проверка: если это путь к локальному файлу, проверяем его наличие
        if (typeof fileSource === 'string' && (fileSource.includes('/') || fileSource.includes('\\'))) {
            if (!fs.existsSync(fileSource)) {
                throw new Error(`Файл не найден по пути: ${fileSource}`);
            }
            // Отправляем локальный файл через Stream
            return await ctx.replyWithDocument({ source: fileSource }, {
                caption: caption,
                parse_mode: 'HTML'
            });
        }

        // Если это File ID (строка без слешей), отправляем напрямую через Telegram Cloud
        return await ctx.replyWithDocument(fileSource, {
            caption: caption,
            parse_mode: 'HTML'
        });
    } catch (e) {
        console.error(`[Utils.sendPDF] Error: ${e.message}`);
        await ctx.reply("🔮 <b>Свиток временно недоступен.</b>\nПопробуй позже или напиши мастеру в личные сообщения.", { parse_mode: 'HTML' });
    }
}

/**
 * Обрабатывает подтверждение оплаты: отменяет напоминание и уведомляет админа.
 * @param {Object} ctx - Контекст Telegraf.
 * @param {Object} data - Данные из конфига воронки.
 */
async function handlePaymentConfirmation(ctx, data) {
    const userId = ctx.from.id;

    // 1. Остановка планировщика (Reminder)
    const job = schedule.scheduledJobs[`reminder_${userId}`];
    if (job) {
        job.cancel();
        console.log(`[Scheduler] Напоминание для ${userId} отменено (подтверждение оплаты).`);
    }

    // 2. Текст для пользователя
    const userText = `✨ <b>Твой сигнал принят!</b>\n\nЯ уже передаю весточку Марии. В ближайшее время я проверю зачисление и пришлю тебе <b>календарь для выбора даты на первую сессию</b> твоего Путешествия.\n\n📖 Пока я проверяю данные, убедись, что ты сохранил(а) PDF-практику — она пригодится в самом начале.`;

    const keyboard = [
        [ { text: "📩 Написать мастеру", callback_data: "contact_admin" } ],
        [ { text: "🔙 В начало", callback_data: "funnel_gift" } ]
    ];

    await ctx.reply(userText, { 
        parse_mode: "HTML", 
        reply_markup: { inline_keyboard: keyboard } 
    });

    // 3. Уведомление администратору
    const adminId = data.admin_id;
    if (adminId) {
        const userInfo = ctx.from.username ? `@${ctx.from.username}` : `ID: ${ctx.from.id}`;
        const alertText = `🚀 <b>Новая заявка на оплату!</b>\n\n` +
                          `Пользователь: ${userInfo}\n` +
                          `Имя: ${ctx.from.first_name}\n\n` +
                          `Нужно проверить банк и открыть доступ к курсу.`;
        
        await ctx.telegram.sendMessage(adminId, alertText, { parse_mode: "HTML" })
            .catch(e => console.error('Ошибка уведомления админа:', e.message));
    }
}

module.exports = { 
    extractUrl, 
    trackFileIds,
    sendPDF,
    handlePaymentConfirmation  
};