const ai = require('./ai');
const roles = require('./roles');
const config = require('./config');
const storage = require('./storage');
const { Markup } = require('telegraf');
const bazi = require('./bazi');

/**
 * @module AstroCheck
 * @description Логика астрологического чекапа с динамическим списком моделей из конфига.
 */
const astro = {
    /**
     * Основной метод обработки даты рождения
     */
    handle: async (ctx, userSettings, userHistory, menus) => {
        const userId = ctx.from.id;
        const text = ctx.message.text;

        // (Автовыход из режима) ---
        // Список кнопок, которые должны прерывать чекап
         const menuButtons = ['💎 Услуги', '📈 Быстрый Коучинг', '📈 Коучинг','✨ Личная Сказка', '⬅️ Назад', 'Главное меню'];
         if (menuButtons.includes(text)) {
            userSettings[userId].isAstroCheck = false;
            storage.save(config.SETTINGS_FILE, userSettings);
            // Возвращаем управление основному хендлеру (просто выходим из функции)
            return false; 
        }

        // 1. Попытка расчета столпов
        const calc = bazi.calculate(text);

        // Если дата не распознана или некорректна
        if (!calc) {
            return await ctx.reply("✨ Пожалуйста, укажите дату и время рождения (например: 26.08.1983 14:30), чтобы я смогла построить карту.");
        }

        // Подготовка данных для ИИ на основе успешного расчета
        const baziData = `
ДАННЫЕ ДЛЯ АНАЛИЗА:
- Господин Дня: ${calc.master}
- Столп Года: ${calc.pillars.year}
- Столп Месяца: ${calc.pillars.month}
- Столп Дня: ${calc.pillars.day}
- Столп Часа: ${calc.pillars.hour}
`;

        let answer = "";
        let usedModel = "";

        await ctx.sendChatAction('typing');

        // Получаем список моделей из конфига
        const modelsToTry = config.ASTRO_MODELS || [config.DEFAULT_MODEL];

        // 2. Цикл Fallback: перебор моделей
        for (const modelId of modelsToTry) {
            try {
                console.log(`🔮 Astro: Пробую модель ${modelId}...`);
                
                const messages = [
                    { role: 'system', content: roles.astroCoach },
                    { role: 'user', content: `${baziData}\n\nЗАДАЧА: Опиши элемент личности через мягкие образы и коучинговый подход. Пиши только выводы анализа. Используй эмодзи 🌲🔥🌊.` }
                ];

                const response = await ai.getAIResponse(messages, modelId, false);
                answer = (response.data.choices?.[0]?.message?.content || "").trim();

                if (answer) {
                    usedModel = modelId;
                    break; 
                }
            } catch (err) {
                console.error(`⚠️ Модель ${modelId} не ответила:`, err.message);
            }
        }

        if (!answer) {
            return await ctx.reply("😔 Извините, сейчас связь со звездами прервалась. Попробуйте отправить данные еще раз чуть позже.");
        }

        console.log(`✅ Astro: Успешный ответ от ${usedModel}`);

        // 3. Сброс режима и сохранение (ИСПРАВЛЕНО: обращение через объект настроек)
        userSettings[userId].isAstroCheck = false;
        storage.save(config.SETTINGS_FILE, userSettings);

        // 4. Контроль длины сообщения
        if (answer.length > 3900) answer = answer.substring(0, 3800) + "...";

        // 5. Финальный ответ с кнопками
        return await ctx.reply(answer, {
            parse_mode: "HTML",
            ...menus.trainings(), // Reply-клавиатура (кнопки внизу)
            reply_markup: {
                ...menus.trainings().reply_markup,
                inline_keyboard: [
                    [{ text: "🚀 Экспресс-сессия (Быстро)", callback_data: "fast_coaching_start" }],
                    [{ text: "✨ Личная Сказка (Глубоко)", callback_data: "funnel_gift" }],
                    [{ text: "✉️ Написать Марии", url: "https://t.me" }]
                ]
            }
        });
    }
};

module.exports = astro;