const config = require('./config');
const { extractUrl } = require('./utils');

/**
 * Обработчик состояний админ-рассылки.
 * @param {Object} ctx - Контекст Telegraf.
 * @param {Object} userSettings - Объект настроек всех пользователей.
 * @param {Object} menus - Модуль генерации клавиатур.
 * @param {Function} startBroadcast - Функция запуска массовой отправки.
 * @returns {Promise<boolean>} - true, если сообщение было обработано как часть рассылки.
 */
async function handleBroadcast(ctx, userSettings, menus, startBroadcast) {
    const userId = ctx.from.id;
    const admin = userSettings[userId];
    const { text, photo, document } = ctx.message || {};

    // Проверка прав администратора
    if (userId !== Number(config.ADMIN_ID)) return false;

    // Вспомогательная функция для сброса состояния
    const resetAdminState = () => {
        admin.waitingForBroadcastPhoto = false;
        admin.waitingForBroadcastText = false;
        admin.waitingForConfirm = false;
        admin.broadcastPhotoId = null;
        admin.broadcastFileId = null;
        admin.broadcastDraftText = null;
    };

    // ШАГ 1: Прием медиа-контента (Фото, PDF или текст)
    if (admin?.waitingForBroadcastPhoto) {
        if (text === '❌ Отмена') {
            resetAdminState();
            await ctx.reply('Рассылка отменена.', menus.main());
            return true;
        }

        if (photo) {
            admin.broadcastPhotoId = photo[photo.length - 1].file_id;
            admin.broadcastFileId = null;
            admin.waitingForBroadcastPhoto = false;
            admin.waitingForBroadcastText = true;
            await ctx.reply('📸 Фото принято. Теперь пришлите текст описания (ссылки в тексте превратятся в кнопки):');
            return true;
        }

        if (document) {
            admin.broadcastFileId = document.file_id;
            admin.broadcastPhotoId = null;
            admin.waitingForBroadcastPhoto = false;
            admin.waitingForBroadcastText = true;
            await ctx.reply('📄 Файл принят. Теперь пришлите текст описания:');
            return true;
        }

        if (text) {
            admin.broadcastDraftText = text;
            admin.waitingForConfirm = true;
            admin.waitingForBroadcastPhoto = false;
            await ctx.reply(`Предпросмотр (только текст):\n\n${text}`, menus.confirmBroadcast());
            return true;
        }
    }

    // ШАГ 2: Прием сопроводительного текста
    if (admin?.waitingForBroadcastText && text) {
        if (text === '❌ Отмена') {
            resetAdminState();
            await ctx.reply('Рассылка отменена.', menus.main());
            return true;
        }

        admin.broadcastDraftText = text;
        admin.waitingForBroadcastText = false;
        admin.waitingForConfirm = true;

        const previewConfig = { caption: text, ...menus.confirmBroadcast() };
        
        if (admin.broadcastPhotoId) {
            await ctx.sendPhoto(admin.broadcastPhotoId, previewConfig);
        } else if (admin.broadcastFileId) {
            await ctx.sendDocument(admin.broadcastFileId, previewConfig);
        }
        return true;
    }

    // ШАГ 3: Подтверждение и запуск
    if (admin?.waitingForConfirm) {
        if (text === '✅ Отправить всем') {
            const content = {
                text: admin.broadcastDraftText,
                photo: admin.broadcastPhotoId,
                file: admin.broadcastFileId,
                url: extractUrl(admin.broadcastDraftText)
            };

            resetAdminState();
            return startBroadcast(ctx, userSettings, menus, content);
        }

        if (text === '❌ Отмена') {
            resetAdminState();
            await ctx.reply('Рассылка отменена.', menus.main());
            return true;
        }
    }

    return false; // Сообщение не относится к рассылке
}

module.exports = handleBroadcast;