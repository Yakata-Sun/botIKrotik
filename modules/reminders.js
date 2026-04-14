// reminders.js
/**
 * @file Модуль управления напоминаниями для воронки
 * @description Содержит функции для планирования и отмены напоминаний пользователям
 * @module reminders
 */

const schedule = require("node-schedule");
const { Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");

/**
 * Путь к конфигурационному файлу воронки
 * @constant {string}
 * @default
 */
const CONFIG_PATH = path.join(process.cwd(), "data", "funnel_config.json");

/**
 * Загружает данные конфигурации из JSON файла
 * @function getData
 * @private
 * @returns {Object} Объект с данными конфигурации воронки
 * @returns {Object} .images - Объект с путями к изображениям
 * @returns {Object} .content - Объект с текстовым контентом
 * @returns {Object} .prices - Объект с информацией о ценах
 */
function getData() {
  try {
    // Читаем и парсим конфигурационный файл
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch (error) {
    // Логируем ошибку и возвращаем пустой объект для предотвращения падений
    console.error("[Reminders] Ошибка загрузки конфига:", error.message);
    return { images: {}, content: {}, prices: {} };
  }
}

/**
 * Планирует автоматическое напоминание пользователю через 20 часов
 * @function scheduleReminder
 * @public
 * @param {import('telegraf').Context} ctx - Контекст Telegraf с информацией о пользователе и боте
 * @description 
 *   - Отменяет существующее напоминание для пользователя (если есть)
 *   - Планирует отправку напоминания через 20 часов
 *   - Отправляет сообщение с изображением, текстом и кнопкой для спецпредложения
 * @example
 *   // После успешного взаимодействия с пользователем
 *   await scheduleReminder(ctx);
 */
function scheduleReminder(ctx) {
  // Получаем уникальный ID пользователя из контекста
  const userId = ctx.from.id;
  
  // Рассчитываем время срабатывания (текущее время + 20 часов)
  const fireDate = new Date(Date.now() + 20 * 60 * 60 * 1000);

  // Проверяем наличие уже запланированного напоминания для этого пользователя
  const existingJob = schedule.scheduledJobs[`reminder_${userId}`];
  if (existingJob) {
    // Если напоминание уже существует - отменяем его
    existingJob.cancel();
    console.log(`[Reminders] Существующее напоминание для ${userId} отменено`);
  }

  // Планируем новое напоминание
  schedule.scheduleJob(`reminder_${userId}`, fireDate, async () => {
    try {
      // Загружаем актуальные данные конфигурации
      const data = getData();
      
      // Формируем текст напоминания с использованием данных из конфига
      const text = `🌑 <b>Твой Хранитель ждет у врат...</b>\n\n` +
                  `Спеццена на Путешествие (<b>${data.prices.special}</b>) скоро сгорит. ` +
                  `Готов(а) стать Автором своей жизни?`;
      
      // Создаем inline-клавиатуру с кнопкой для перехода к оплате
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.url("🔥 Сохранить спеццену", "https://pay.ru")],
      ]);

      // Отправляем сообщение с изображением, текстом и клавиатурой
      await ctx.telegram.sendPhoto(userId, data.images.reminder, {
        caption: text,
        parse_mode: "HTML",
        ...keyboard,
      });

      console.log(`[Reminders] Напоминание успешно отправлено пользователю ${userId}`);
    } catch (error) {
      // Обрабатываем возможные ошибки отправки (например, пользователь заблокировал бота)
      console.error(`[Reminders] Ошибка отправки напоминания ${userId}:`, error.message);
    }
  });

  console.log(`[Reminders] Напоминание запланировано для ${userId} на ${fireDate}`);
}

/**
 * Отменяет запланированное напоминание для конкретного пользователя
 * @function stopReminder
 * @public
 * @param {number|string} userId - Уникальный идентификатор пользователя Telegram
 * @description 
 *   - Ищет запланированное задание по userId
 *   - Отменяет выполнение задания если оно найдено
 *   - Логирует результат операции
 * @example
 *   // При получении оплаты от пользователя
 *   stopReminder(userId);
 */
function stopReminder(userId) {
  // Формируем имя задания по шаблону
  const jobName = `reminder_${userId}`;
  
  // Ищем запланированное задание
  const job = schedule.scheduledJobs[jobName];
  
  if (job) {
    // Отменяем выполнение задания
    job.cancel();
    console.log(`[Reminders] Напоминание для пользователя ${userId} успешно отменено`);
  } else {
    // Логируем случай, когда задание не найдено
    console.log(`[Reminders] Напоминание для пользователя ${userId} не найдено`);
  }
}

// Экспортируем функции для использования в других модулях
module.exports = {
  scheduleReminder,
  stopReminder
};