/**
 * @file broadcastHandler.js
 * @description Модуль пошагового сбора контента для рассылки (Стейт-машина).
 * Позволяет админу отправить: Фото + Текст, PDF + Текст или просто Текст.
 * Автоматически извлекает первую ссылку из текста и превращает её в кнопку.
 */

const config = require('./config');
const { extractUrl } = require('./utils');
const { Markup } = require('telegraf');

/**
 * Основной обработчик логики рассылки.
 * @async
 * @param {Object} ctx - Контекст сообщения Telegraf.
 * @param {Object} userSettings - Общий объект настроек пользователей (используется для хранения стейта админа).
 * @param {Object} menus - Модуль с клавиатурами (Reply Keyboards).
 * @param {Function} startBroadcast - Функция запуска фактической рассылки.
 * @returns {Promise<boolean>} - true, если сообщение перехвачено рассылкой; false, если идти дальше (в ИИ).
 */
async function handleBroadcast(ctx, userSettings, menus, startBroadcast) {
    const userId = ctx.from.id;
    const admin = userSettings[userId];
    
    // Безопасное получение данных из сообщения
    const { text, photo, document } = ctx.message || {};

    // 1. ПРОВЕРКА ПРАВ: Если пишет не админ, игнорируем модуль полностью
    if (userId !== Number(config.ADMIN_ID)) return false;

    /**
     * Вспомогательная функция для полной очистки временных данных админа.
     * Вызывается при отмене или успешном завершении рассылки.
     */
    const resetAdminState = () => {
        admin.waitingForBroadcastPhoto = false;
        admin.waitingForBroadcastText = false;
        admin.waitingForConfirm = false;
        admin.broadcastPhotoId = null;
        admin.broadcastFileId = null;
        admin.broadcastDraftText = null;
    };

    // --- ШАГ 1: ПРИЕМ МЕДИА-КОНТЕНТА (Фото, PDF или просто текст) ---
    if (admin?.waitingForBroadcastPhoto) {
        // Кнопка отмены
        if (text === '❌ Отмена') {
            resetAdminState();
            await ctx.reply('Рассылка отменена.', menus.main());
            return true;
        }

        // А) Если админ прислал ФОТО
        if (photo) {
            admin.broadcastPhotoId = photo[photo.length - 1].file_id; // Берем лучшее качество
            admin.broadcastFileId = null;
            admin.waitingForBroadcastPhoto = false;
            admin.waitingForBroadcastText = true;
            await ctx.reply('📸 Фото принято. Теперь пришлите текст описания:');
            return true;
        }

        // Б) Если админ прислал ДОКУМЕНТ (PDF и др.)
        if (document) {
            admin.broadcastFileId = document.file_id;
            admin.broadcastPhotoId = null;
            admin.waitingForBroadcastPhoto = false;
            admin.waitingForBroadcastText = true;
            await ctx.reply('📄 Файл принят. Теперь пришлите текст описания:');
            return true;
        }

        // В) Если админ прислал ТЕКСТ (значит рассылка будет без вложений)
        if (text) {
            admin.broadcastDraftText = text;
            admin.waitingForConfirm = true;
            admin.waitingForBroadcastPhoto = false;
            
            // Ищем ссылку для предпросмотра кнопки
            const url = extractUrl(text);
            const extra = url ? Markup.inlineKeyboard([[Markup.button.url('🔗 Открыть ссылку', url)]]) : null;

            await ctx.reply(`Предпросмотр сообщения (без медиа):\n\n${text}`, {
                ...extra,
                ...menus.confirmBroadcast()
            });
            return true;
        }
    }

    // --- ШАГ 2: ПРИЕМ ТЕКСТА ОПИСАНИЯ (после загрузки медиа) ---
    if (admin?.waitingForBroadcastText && text) {
        if (text === '❌ Отмена') {
            resetAdminState();
            await ctx.reply('Рассылка отменена.', menus.main());
            return true;
        }

        admin.broadcastDraftText = text;
        admin.waitingForBroadcastText = false;
        admin.waitingForConfirm = true;

        // Ищем ссылку в тексте для создания инлайн-кнопки
        const url = extractUrl(text);
        const inlineBtn = url ? [Markup.button.url('🔗 Открыть ссылку', url)] : [];
        
        // Формируем конфиг предпросмотра: объединяем инлайн-кнопку и кнопки подтверждения
        const previewConfig = { 
            caption: text,
            reply_markup: {
                inline_keyboard: inlineBtn.length ? [inlineBtn] : [],
                ...menus.confirmBroadcast().reply_markup
            }
        };
        
        // Показываем админу, как будет выглядеть сообщение
        if (admin.broadcastPhotoId) {
            await ctx.sendPhoto(admin.broadcastPhotoId, previewConfig);
        } else if (admin.broadcastFileId) {
            await ctx.sendDocument(admin.broadcastFileId, previewConfig);
        }
        return true;
    }

    // --- ШАГ 3: ФИНАЛЬНОЕ ПОДТВЕРЖДЕНИЕ И ЗАПУСК ---
    if (admin?.waitingForConfirm) {
        if (text === '✅ Отправить всем') {
            // Собираем финальный объект контента для функции отправки
            const content = {
                text: admin.broadcastDraftText || "",
                photo: admin.broadcastPhotoId,
                file: admin.broadcastFileId,
                url: extractUrl(admin.broadcastDraftText)
            };

            // Очищаем стейт ПЕРЕД запуском, чтобы не зациклить админа при ошибках
            resetAdminState();
            
            // Передаем управление в основной модуль рассылки (цикл по всем юзерам)
            await startBroadcast(ctx, userSettings, menus, content);
            return true;
        }

        if (text === '❌ Отмена') {
            resetAdminState();
            await ctx.reply('Рассылка отменена.', menus.main());
            return true;
        }
    }

    // Если ни одно условие не сработало (админ просто пишет боту), возвращаем false
    return false;
}

module.exports = handleBroadcast;