const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

/**
 * @module Funnel
 * @description Исправленная версия с надежной загрузкой JSON
 */
const funnel = {
    // Используем process.cwd() для более надежного определения пути от корня проекта
    configPath: path.join(process.cwd(), 'data', 'funnel_config.json'),
    
    /**
     * Загружает актуальные данные из JSON-файла.
     */
    loadData: () => {
        try {
            if (!fs.existsSync(funnel.configPath)) {
                console.error(`❌ Файл не найден по пути: ${funnel.configPath}`);
                return null;
            }
            const rawData = fs.readFileSync(funnel.configPath, 'utf8');
            return JSON.parse(rawData);
        } catch (error) {
            console.error('❌ Ошибка парсинга funnel_config.json:', error);
            return null;
        }
    },

    init: (bot) => {
        bot.action('funnel_gift', async (ctx) => {
            const data = funnel.loadData();
            
            // Если данные не загрузились, выводим ошибку в консоль и уведомляем пользователя
            if (!data || !data.contactUrl) {
                console.error("❌ Данные воронки не загружены или отсутствует contactUrl");
                return await ctx.reply("⚠️ Ошибка конфигурации воронки. Пожалуйста, обратитесь к администратору.");
            }

            await ctx.answerCbQuery();
            
            await ctx.reply("✨ <b>Ваш путь начинается!</b>\n\nДержите ваш первый ключ — мини-практику «Встреча с Хранителем сказки».", { parse_mode: 'HTML' });

            // Отправляем файл
            await ctx.replyWithDocument(data.presentationId, {
                caption: "📖 Ваша мини-практика (PDF).",
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.url('✨ Начать историю с Марией', data.contactUrl)]
                ]).reply_markup
            });
            
            setTimeout(async () => {
                // Повторно берем данные на случай изменений
                const currentData = funnel.loadData();
                if (!currentData) return;

                await ctx.reply("Теперь, когда Ключ у вас, всмотритесь в эти образы... ✨\nКакая карта притягивает ваш взгляд?");
                
                const mediaGroup = Object.keys(currentData.cardFileIds).map(id => ({
                    type: 'photo',
                    media: currentData.cardFileIds[id],
                    caption: `Карта №${id}`
                }));

                await ctx.replyWithMediaGroup(mediaGroup);

                await ctx.reply(
                    "Выберите номер карты:",
                    Markup.inlineKeyboard([
                        [1, 2, 3, 4].map(n => Markup.button.callback(`🃏 ${n}`, `mac_${n}`)),
                        [5, 6, 7, 8].map(n => Markup.button.callback(`🃏 ${n}`, `mac_${n}`)),
                        [Markup.button.url('✉️ Обсудить инсайт с Марией', currentData.contactUrl)]
                    ])
                );
            }, 10000);
        });

        bot.action(/^mac_(\d+)$/, async (ctx) => {
            const data = funnel.loadData();
            if (!data) return;

            const cardNumber = ctx.match[1];
            const fileId = data.cardFileIds[cardNumber];
            const captionText = data.texts[cardNumber];

            await ctx.answerCbQuery();

            setTimeout(async () => {
                await ctx.replyWithPhoto(fileId, {
                    caption: captionText + "\n\n✨ <i>Это ваш ключ к сегодняшнему состоянию.</i>",
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.url('📖 Написать свою сказку', data.contactUrl)]
                    ])
                });
            }, 1000); 

            setTimeout(() => {
                ctx.reply(
                    "Это лишь начало вашей истории. ✨\n\nГотовы войти в свою <b>Личную Сказку</b>?\n\nНапишите мне напрямую: @sherab_wangmo",
                    {
                        parse_mode: 'HTML',
                        ...Markup.inlineKeyboard([
                            [Markup.button.url('✍️ Написать Марии', data.contactUrl)]
                        ])
                    }
                );
            }, 5000); 
        });
    }
};

module.exports = funnel;