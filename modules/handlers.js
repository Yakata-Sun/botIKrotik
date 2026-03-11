/**
 * @module Handlers
 * @description Основной контроллер навигации. Обрабатывает нажатия кнопок Reply-меню и переключает экраны.
 */

const storage = require("./storage");
const config = require("./config");
const menus = require("./menus");

/**
 * Маршрутизатор текстовых сообщений.
 * @async
 * @param {Object} ctx - Контекст сообщения Telegraf.
 * @param {Object} userSettings - Общий объект настроек всех пользователей.
 * @returns {Promise<boolean>} Возвращает true, если кнопка обработана, иначе false (для передачи сообщения в ИИ).
 */
module.exports = async (ctx, userSettings) => {
  const text = ctx.message.text;
  const userId = ctx.from.id;
  const settings = userSettings[userId];

  // Если настроек нет (защита от ошибок), выходим
  if (!settings) return false;

  switch (text) {
    // --- ГЛАВНАЯ НАВИГАЦИЯ ---
    case "⬅️ Назад":
    case "Главное меню":
      return await ctx.reply("Главное меню:", menus.main());

    case "❓ Справка":
      return await ctx.reply("Я — И-Кротик. Помогаю общаться с ИИ и узнавать об услугах Марии.");

    // --- КАТЕГОРИИ УСЛУГ ---
    case "💎 Услуги":
    case "⬅️ Назад в услуги":
      return await ctx.reply("Выберите интересующее направление:", menus.buy());

    case "🎓 Тренинги":
      return await ctx.reply("Наши актуальные тренинги:", menus.trainings());

    case "💻 Разработка":
      return await ctx.reply("Услуги по разработке IT-решений:", menus.dev());

    // --- ЛОГИКА ВОПРОСА ---
    case "✍️ Задать вопрос":
      settings.waitingForAuthor = true; // Ставим флаг ожидания текста
      return await ctx.reply(
        "Просто напиши свой вопрос следующим сообщением! Я передам его Марии.",
        { reply_markup: { remove_keyboard: true } } // Убираем кнопки, чтобы не мешали вводу
      );

    // --- ЛОГИКА ИИ (ВЫБОР МОДЕЛИ) ---
    case "🤖 Спросить ИИ":
    case "🤖 Сменить модель":
      return await ctx.reply("Выберите текстовую модель нейросети:", menus.ai());

    // --- ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ (С ГАЛОЧКАМИ) ---
    case "⚡️ Быстро (Кратко)":
    case "✅ ⚡️ Быстро":
      settings.mode = "short";
      storage.save(config.SETTINGS_FILE, userSettings);
      return await ctx.reply("🚀 Режим: Краткие ответы. Экономлю ваше время!", menus.chatAI(settings));

    case "📚 Подробно (Детально)":
    case "✅ 📚 Подробно":
      settings.mode = "long";
      storage.save(config.SETTINGS_FILE, userSettings);
      return await ctx.reply("📖 Режим: Детальные ответы. Пишу развернуто и глубоко.", menus.chatAI(settings));

    // --- ОБРАБОТКА КОНКРЕТНЫХ УСЛУГ: ТРЕНИНГИ ---
    case "🧘 Личная Сказка":
      return await ctx.reply("✨ *Личная Сказка* — это методика глубокой трансформации через метафоры. Помогает найти ответы внутри себя.\n\nДля записи: @sherab_wangmo", { parse_mode: 'Markdown' });

    case "📈 Быстрый Коучинг":
      return await ctx.reply("🚀 *Быстрый Коучинг* — фокус-сессия для решения конкретного запроса здесь и сейчас.\n\nЗаписаться: @sherab_wangmo", { parse_mode: 'Markdown' });

    // --- ОБРАБОТКА КОНКРЕТНЫХ УСЛУГ: РАЗРАБОТКА ---
    case "🤖 Создание ботов":
      return await ctx.reply("🤖 *Создание ботов* — разработка сложных систем, интеграция ИИ и автоматизация бизнеса.\n\nОбсудить проект: @sherab_wangmo", { parse_mode: 'Markdown' });

    case "⚙️ Создание лендинга":
      return await ctx.reply("🖥 *Создание лендинга* — продающие страницы с современным дизайном и высокой конверсией.");

    case "🤖 Доработка ботов":
      return await ctx.reply("🛠 *Доработка ботов* — исправление ошибок, добавление новых функций и оптимизация вашего текущего бота.");

    case "⚙️ Frontend-разработка":
      return await ctx.reply("🎨 *Frontend-разработка* — создание интерфейсов на React/Vue, верстка и оживление макетов.");

    default:
      // Если текст не совпал ни с одной кнопкой, возвращаем false.
      // Это сигнал для bot.js, что сообщение нужно отправить в ИИ.
      return false;
  }
};