const { askAI } = require('./ai-helper');
const ai = require('./ai');
const roles = require('./roles');
const config = require('./config');
const storage = require('./storage');
const { Markup } = require('telegraf');
const bazi = require('./bazi');


const astro = {
    handle: async (ctx, userSettings, userHistory, menus) => {
        const userId = ctx.from.id;
        const text = ctx.message.text;

        // 0. Проверка на выход из режима (оставляем вашу логику)
        const menuButtons = ['🎭 Мои Услуги', '✨ Самопознание и Сказки', '💻 IT-разработка (Боты/Сайты)', '⬅️ В главное меню', '📈 Карта Пути (Сессия)', '✨ Курс-Путешествие', '⬅️ Назад в услуги', '✍️ Задать вопрос', '❓ Справка', '⚙️ Админ-панель'];
        if (menuButtons.includes(text)) {
            userSettings[userId].isAstroCheck = false;
            return false; 
        }

        // 1. Если пользователь только что ввел дату
        const calc = bazi.calculate(text);
        if (calc) {
            // Сохраняем расчет во временное хранилище (в userSettings или storage)
            userSettings[userId].tempBazi = calc;
            userSettings[userId].lastBirthDate = text; 
            storage.save(config.SETTINGS_FILE, userSettings);

            // ВАЖНО: Спрашиваем запрос ПЕРЕД анализом ИИ
            return await ctx.reply("✨ Пока я строю карту, выбери тему, которая сейчас волнует больше всего:", 
                Markup.inlineKeyboard([
                    [Markup.button.callback('🌀 Разбрасываюсь / Берусь сразу за многое', 'goal_scattered')],
                    [Markup.button.callback('🛡️ Боюсь начать / Сомневаюсь', 'goal_fear')],
                    [Markup.button.callback('🛤️ Ищу свое предназначение', 'goal_mission')],            
        [Markup.button.callback('🧭 Потерялся, не знаю куда идти', 'goal_lost')], 
        [Markup.button.callback('🔋 Нет сил, где найти ресурс?', 'goal_no_energy')], 
                    [Markup.button.callback('💎 Хочу масштаб и рост', 'goal_growth')]
                ])
            );
        }

        // Если это не дата и не кнопка меню — просим дату
        return await ctx.reply("Чтобы я построил карту, напиши дату и время рождения (например: 26.08.1983 14:30)");
    },

    /**
     *  Обработка выбора цели и запуск ИИ
     * Вызывайте его из action-хендлера бота (ctx.on('callback_query'))
     */
   processAI: async (ctx, userSettings, goalText) => {
        const userId = ctx.from.id;
        const calc = userSettings[userId].tempBazi;

         // Сохраняем выбранный запрос в настройки
    userSettings[userId].lastAstroGoal = goalText;
    storage.save(config.SETTINGS_FILE, userSettings);
        
        if (!calc) return ctx.reply("Ошибка: данные карты потеряны. Введи дату снова.");

        await ctx.answerCbQuery();
        await ctx.editMessageText("🔮 Звезды шепчутся... Анализирую твой запрос через призму Ба Цзы...");

        const baziData = `Элемент личности: ${calc.master}. Столпы: ${calc.pillars.year}, ${calc.pillars.month}, ${calc.pillars.day}, ${calc.pillars.hour}`;
        
        // Формируем динамическую задачу для ИИ
        const userTask = `
ЗАПРОС КЛИЕНТА: "${goalText}".
ДАННЫЕ КАРТЫ: ${baziData}.
ЗАДАЧА: Проанализируй карту Ба Цзы именно через призму этого запроса. 
- Найди в элементах причину, почему возник этот вопрос.
- Опиши 2 самые сильные и 2 самые слабые стороны личности как союзников и препятствия в контексте этого запроса.
- Дай коуч-совет.
- Используй мягкий стиль сказочного Пути Героя. Пиши кратко, чтобы каждое слово имело смысл. Не используй китайских терминов, кроме названия Господина Дня.
`;
 // Формируем массив для ИИ
        const messages = [
            { 
                role: "system", 
                content: roles.astroCoach 
            },
            { 
                role: "user", 
                content: userTask 
            }
        ];
        let answer =  await askAI(messages, false);

        if (!answer) {
            return await ctx.reply("😔 Извините, сейчас связь со звездами прервалась. Попробуйте отправить данные еще раз чуть позже.");
        }

        console.log(`✅ Astro: Успешный ответ`);

        // 3. Сброс режима и сохранение (ИСПРАВЛЕНО: обращение через объект настроек)
        userSettings[userId].isAstroCheck = false;
        storage.save(config.SETTINGS_FILE, userSettings);

        // 4. Контроль длины сообщения
        if (answer.length > 3900) answer = answer.substring(0, 3800) + "...";

        // 5. Финальный ответ с кнопками
                await ctx.reply(answer, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🚀 Создать Карту Пути", callback_data: "map-kouch" }],
                    [{ text: "✉️ Написать Марии", url: "https://t.me/sherab_wangmo" }]
                ]
            }
        });

        // Устанавливаем таймер на 10 секунд для финального сообщения с меню
        setTimeout(async () => {
            try {
                await ctx.telegram.sendMessage(userId, 
                    "Надеюсь, этот разбор был полезен! ✨\nВы можете выбрать другие услуги в меню ниже 👇", 
                    menus.trainings()
                );
            } catch (err) {
                console.error("Ошибка при отправке отложенного меню:", err.message);
            }
        }, 10000); // 10 000 миллисекунд = 10 секунд

        return true; 
    }
};

module.exports = astro;