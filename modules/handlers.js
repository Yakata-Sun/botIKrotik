/**
 * @module Handlers
 * @description Основной контроллер навигации. Обрабатывает нажатия кнопок Reply-меню и переключает экраны.
 */
const { Markup } = require('telegraf');
const storage = require("./storage");
const config = require("./config");
const menus = require("./menus");

/**
 * Маршрутизатор текстовых сообщений.
 * @async
 * @param {Object} ctx - Контекст сообщения Telegraf.
 * @param {Object} userSettings - Общий объект настроек всех пользователей.
 * @param {Object} userHistory - История сообщений (добавили параметр).
 * @returns {Promise<boolean>} Возвращает true, если кнопка обработана, иначе false (для передачи сообщения в ИИ).
 */
module.exports = async (ctx, userSettings, userHistory) => {
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
      return await ctx.reply("Я — И-Кротик. Воспользуйтесь навигацией по кнопкам или напишите вопрос Марии .\n\n @sherab_wangmo");

    // --- КАТЕГОРИИ УСЛУГ ---
    case "💎 Услуги":
    case "⬅️ Назад в услуги":
            console.log('Нажата кнопка услуг. Объект menus существует:', !!menus);
      return await ctx.reply("Выберите интересующее направление:", menus.buy());

    case "📈 Коучинг":
      return await ctx.reply("Актуальные тренинги:", menus.trainings());

    case "💻 Разработка":
      return await ctx.reply("Услуги по разработке IT-решений:", menus.dev());

    // --- ЛОГИКА ВОПРОСА ---
    case "✍️ Задать вопрос":
      // Снимаем флаг ожидания, если он вдруг остался от старой версии
      settings.waitingForAuthor = false;
      storage.save(config.SETTINGS_FILE, userSettings);

      return await ctx.reply(
        "✍️ <b>Связь с Марией</b>\n\nНажмите на кнопку ниже, чтобы перейти в личный чат и задать свой вопрос напрямую!",
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                // Укажите здесь вашу ссылку на профиль
                { text: '✉️ Написать Марии', url: 'https://t.me/sherab_wangmo' }
              ]
            ]
          }
        }
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
   // --- ОЧИСТКА КОНТЕКСТА ---
    case "🧹 Очистить контекст":
      // Обнуляем массив истории для этого пользователя
      userHistory[userId] = []; 
      // Сохраняем изменения в файл через модуль storage
      storage.save(config.HISTORY_FILE, userHistory);
      
      return await ctx.reply(
        "🧹 Контекст очищен! ИИ больше не помнит нашу предыдущую переписку.", 
        menus.chatAI(settings)
      );

    // --- ОБРАБОТКА КОНКРЕТНЫХ УСЛУГ: ТРЕНИНГИ ---
    case "✨ Личная Сказка":
      return await ctx.reply( `✨ <b>Представьте, что у вас есть Карта...</b>\n\n` +
        `Эта карта точно показывает вам как прийти к своей мечте...\n\n` + 
        `Я разработала метод, сочетающий <b>life-коучинг, сказкотерапию и метафорические карты</b>.\n\n` +
        `и могу помочь Вам написать вашу личную терапевтическую сказку, которая поможет:\n` +
        `• Преодолеть страхи\n` +
        `• Найти внутренние ресурсы\n` +
        `• Проработать план к успеху\n\n` +
        `🎁 Нажмите кнопку ниже, чтобы получить мини-практику «Встреча с Хранителем сказки» в подарок!`,
         { 
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: '🎁 Получить подарок', callback_data: 'funnel_gift' }],
           [{ text: '✉️ Написать Марии', url: 'https://t.me/sherab_wangmo' }]]
          }
        }
      );

       case "📈 Быстрый Коучинг":
      return await ctx.reply(
        `📈 <b>Быстрый Коучинг</b> — это фокус-сессия для решения конкретного запроса здесь и сейчас.\n\n` +
        `Всего за 60 минут мы:\n` +
        `• Разберем вашу ситуацию по косточкам\n` +
        `• Найдем скрытые препятствия\n` +
        `• Составим план из 3-х конкретных шагов к результату\n\n` +
        `Это формат для тех, кто ценит время и хочет ясности сразу.\n\n` +
        `Хотите получить <b>Чек-лист «Самодиагностика запроса»</b> и записаться?`,
        { 
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Да, я хочу!', callback_data: 'fast_coaching_start' }],
              [{ text: '✉️ Просто задать вопрос', url: 'https://t.me/sherab_wangmo' }]
            ]
          }
        }
      );
      case "🔮 Астро-чекап":
    settings.isAstroCheck = true; // Включаем режим сбора данных
    storage.save(config.SETTINGS_FILE, userSettings);
    return await ctx.reply(
        "✨ <b>Хотите понять что про вас написано в звездах?</b>\n\n" +
        "Напишите вашу дату, точное время и место рождения. \n\n" +
        "<i>Я рассчитаю ваш элемент личности и подскажу, на что опереться именно сейчас, чтобы прийти к гармонии..</i>. \n\n",
        { parse_mode: 'HTML' }
    );

    // --- ОБРАБОТКА КОНКРЕТНЫХ УСЛУГ: РАЗРАБОТКА ---
       case "🤖 Создание ботов":
      return await ctx.reply(
        "<b>🤖 Создание ботов</b>\n\nРазработка сложных систем, интеграция ИИ и автоматизация бизнеса.\n\n" +
        "<b>В виде примера вы можете оценить этот бот.\n\n" +
        "<i>Срок: от 7 дней\nСтоимость: от 15 000 руб.</i>", 
        { 
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Оставить заявку', 'order_bot')]
            ])
        }
      );

    case "⚙️ Создание лендинга":
      return await ctx.reply(
        "⚙️ <b>Создание лендинга</b> — продающие страницы с современным дизайном и высокой конверсией.\n\n" +
        "<i>Срок: от 14 дней\n Стоимость: от 15 000 руб.</i>",
       { 
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Оставить заявку', 'order_lending')]
            ])
        }
      );

    case "🤖 Доработка ботов":
      return await ctx.reply(
        "🤖 <b>Доработка ботов</b> — исправление ошибок, добавление новых функций и оптимизация вашего текущего бота.\n\n" +
        "<i>Срок: от 5 дней\nСтоимость: от 5 000 руб.</i>",
        { 
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Оставить заявку', 'order_bot_good')]
            ])
        }
      );

    case "⚙️ Web-разработка":
      return await ctx.reply(
        "⚙️ <b>Web-разработка</b> — создание интерфейсов, верстка, оживление макетов, backend-разработка на Node.js.\n\n" +
        "<i>Срок: от 7 дней\nСтоимость: от 15 000 руб.</i>",
        { 
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Оставить заявку', 'order_web')]
            ])
        }
      );

    default:
      // Если текст не совпал ни с одной кнопкой, возвращаем false.
      // Это сигнал для bot.js, что сообщение нужно отправить в ИИ.
      return false;
  }
};