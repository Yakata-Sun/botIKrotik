const { Markup } = require('telegraf');

/**
 * @module Funnel
 * @description Модуль интерактивной воронки «Личная Сказка».
 * Реализует поэтапное вовлечение пользователя через подарок (PDF), 
 * работу с метафорическими картами (МАК) и переход к личной консультации.
 */
const funnel = {
    /**
     * @namespace data
     * @description Хранилище контента воронки: идентификаторы медиа, тексты и ссылки.
     */
    data: {
        /** 
         * @property {Object} cardFileIds - Telegram File ID для 8 метафорических карт.
         */
        cardFileIds: {
            '1': 'AgACAgIAAxkBAAIEemm-hchF-TGGbFBO7kC59lgbXF1EAAIRFGsbzj7wSZRrm-i-JGazAQADAgADbQADOgQ', 
            '2': 'AgACAgIAAxkBAAIEfWm-hr2j0fniS_p_NdvfzJc7MvTpAAIdFGsbzj7wSXV183QXOFhPAQADAgADbQADOgQ', 
            '3': 'AgACAgIAAxkBAAIEgGm-hvDlUosZT4WdlrkQcMn9VXpwAAIgFGsbzj7wSUQq5HtevLxbAQADAgADbQADOgQ', 
            '4': 'AgACAgIAAxkBAAIEg2m-hzJgP2Fuw2pOckwhe81yMHgoAAIjFGsbzj7wSaGGUFb6xc_nAQADAgADeAADOgQ', 
            '5': 'AgACAgIAAxkBAAIEhmm-iVUffhLdU1l_HKzUXa8Q7_MWAAI7FGsbzj7wSdV32waRiB8_AQADAgADeAADOgQ', 
            '6': 'AgACAgIAAxkBAAIEiWm-ibR2kn9igS51BoKcShCKWOQDAAI8FGsbzj7wSawC7p3BLnyiAQADAgADeAADOgQ', 
            '7': 'AgACAgIAAxkBAAIEr2m-oWDinMDQ7_Vn9i2hH6avFvXUAAKZEmsbzj74ScrkMz02H_PpAQADAgADeAADOgQ', 
            '8': 'AgACAgIAAxkBAAIEjGm-jNldf67n2gu6GB2TjLmzeys1AAJhFGsbzj7wSb3oaVcsMStsAQADAgADeAADOgQ'
        },
        /** 
         * @property {Object} texts - Интерпретации и описания для каждой карты.
         */
        texts: {
            '1': "🌲 <b>Великая Сосна.</b> Чтобы дотянуться до солнца (ваших целей), нужно крепко стоять на ногах. Подумайте, как уже сейчас вы можете укрепить свои корни?",
            '2': "🎭 <b>Шут.</b> Решение уже у вас, нужно лишь подобрать подход и позволить себе немного игры.",
            '3': "🌳 <b>Старец.</b> Ваша сила в глубокой мудрости и устойчивости. Ответ не снаружи, а в тишине.",
            '4': "👦 <b>Мальчик.</b> Время быть собой и сбросить чужие роли. Ваша ноша может стать вашим ресурсом.",
            '5': "🧘‍♀️ <b>Медитация.</b> Внутри вас скрыто сокровище талантов. Просто дайте им пространство проявиться.",
            '6': "🛤 <b>Семья.</b> Любой путь верен, если он выбран сердцем и поддержан внутренним единством.",
            '7': "🕯 <b>Маяк.</b> Вы сами — ориентир для своей жизни. Пусть ваш внутренний огонь притягивает желаемое.",
            '8': "🔥 <b>Горное озеро.</b> Время трансформации и очищения. Ваша глубина — ваша защита."
        },
        /** @property {string} contactUrl - Прямая ссылка на аккаунт специалиста в Telegram. */
        contactUrl: "https://t.me/sherab_wangmo"
    },

    /**
     * Инициализирует слушатели callback-запросов для работы воронки.
     * @param {Telegraf} bot - Экземпляр бота Telegraf.
     */
    init: (bot) => {
        /**
         * Шаг 1: Обработка нажатия на кнопку получения подарка.
         * Отправляет приветствие и PDF-файл с практикой.
         */
        bot.action('funnel_gift', async (ctx) => {
            // Убираем состояние загрузки на кнопке
            await ctx.answerCbQuery();
            
            // File ID PDF-презентации
            const presentationId = 'BQACAgIAAxkBAAIEtGm-vkybLdgP7waPI0gshvR7OMlhAAIHmgACzj74SQUZhyxfSwS_OgQ'; 

            // Отправляем текстовое вступление
            await ctx.reply("✨ <b>Ваш путь начинается!</b>\n\nДержите ваш первый ключ — мини-практику «Встреча с Хранителем сказки».", { parse_mode: 'HTML' });

            // Отправляем документ с встроенной кнопкой связи
            await ctx.replyWithDocument(presentationId, {
                caption: "📖 Ваша мини-практика (PDF).",
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.url('✨ Начать историю с Марией', funnel.data.contactUrl)]
                ]).reply_markup
            });
            
            /**
             * Таймер перехода ко второму этапу (выбор карт).
             * Задержка позволяет пользователю осознать получение подарка.
             */
            setTimeout(async () => {
                await ctx.reply("Теперь, когда Ключ у вас, всмотритесь в эти образы... ✨\nКакая карта притягивает ваш взгляд?");
                
                // Подготовка альбома из 8 фотографий для ознакомления
                const mediaGroup = Object.keys(funnel.data.cardFileIds).map(id => ({
                    type: 'photo',
                    media: funnel.data.cardFileIds[id],
                    caption: `Карта №${id}`
                }));

                // Отправка всех карт одним сообщением (MediaGroup)
                await ctx.replyWithMediaGroup(mediaGroup);

                // Кнопки выбора конкретной карты и дублирующая кнопка связи
                await ctx.reply(
                    "Выберите номер карты:",
                    Markup.inlineKeyboard([
                        [1, 2, 3, 4].map(n => Markup.button.callback(`🃏 ${n}`, `mac_${n}`)),
                        [5, 6, 7, 8].map(n => Markup.button.callback(`🃏 ${n}`, `mac_${n}`)),
                        [Markup.button.url('✉️ Обсудить инсайт с Марией', funnel.data.contactUrl)]
                    ])
                );
            }, 10000); // 10 секунд ожидания
        });

        /**
         * Шаг 2: Обработка выбора конкретной МАК-карты.
         * Отправляет крупное изображение выбранной карты и интерпретацию.
         */
        bot.action(/^mac_(\d+)$/, async (ctx) => {
            const cardNumber = ctx.match[1]; // Извлекаем номер карты из callback_data
            const fileId = funnel.data.cardFileIds[cardNumber];
            const captionText = funnel.data.texts[cardNumber];

            await ctx.answerCbQuery();

            /**
             * Отправка выбранного образа с полным описанием и кнопкой призыва к действию.
             */
            setTimeout(async () => {
                await ctx.replyWithPhoto(fileId, {
                    caption: captionText + "\n\n✨ <i>Это ваш ключ к сегодняшнему состоянию.</i>",
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.url('📖 Написать свою сказку', funnel.data.contactUrl)]
                    ])
                });
            }, 10000); 

            /**
             * Финальное сообщение-оффер с призывом к записи на полноценную услугу.
             */
            setTimeout(() => {
                ctx.reply(
                    "Это лишь начало вашей истории. ✨\n\nГотовы войти в свою <b>Личную Сказку</b>?\n\nНапишите мне напрямую: @sherab_wangmo",
                    {
                        parse_mode: 'HTML',
                        ...Markup.inlineKeyboard([
                            [Markup.button.url('✍️ Написать Марии', funnel.data.contactUrl)]
                        ])
                    }
                );
            }, 5000); 
        });
    }
};

module.exports = funnel;