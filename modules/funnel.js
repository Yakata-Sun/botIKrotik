const { Markup } = require('telegraf');

const funnel = {
    data: {
        cardFileIds: {
            '1': 'AgACAgIAAxkBAAIEUGm9gWTL2tYleEhRhVSxodnqktGuAAK9Fmsb31_pSQbBbSzr85ZWAQADAgADeQADOgQ', '2': 'ID_KEYS', '3': 'ID_TREE', 
            '4': 'ID_MASK', '5': 'ID_CASTLE', '6': 'ID_ROAD', '7': 'ID_FIRE'
        },
        texts: {
            '1': "🧭 <b>Маяк.</b> Ваш ресурс — внутренний ориентир.",
            '2': "🗝 <b>Ключи.</b> Решение уже у вас, нужно лишь подобрать подход.",
            '3': "🌳 <b>Дерево.</b> Ваша сила в корнях и устойчивости.",
            '4': "🎭 <b>Маска.</b> Время быть собой и сбросить чужие роли.",
            '5': "🏰 <b>Замок.</b> Внутри вас скрыто сокровище талантов.",
            '6': "🛤 <b>Развилка.</b> Любой путь верен, если он выбран сердцем.",
            '7': "🔥 <b>Костер.</b> Время трансформации и очищения от страхов."
        },
        giftLink: "https://t.me"
    },

    init: (bot) => {
        bot.action('funnel_gift', async (ctx) => {
            await ctx.answerCbQuery();
            await ctx.reply(`🔮 <b>Ваш подарок:</b> Мини-практика «Встреча с Хранителем».\n\n📥 <a href="${funnel.data.giftLink}">Скачать практику</a>`, { parse_mode: 'HTML' });
            
            setTimeout(async () => {
                await ctx.reply("Всмотритесь в эти образы... ✨\nКакая карта притягивает ваш взгляд прямо сейчас?");
                
                // Формируем альбом из всех 7 карт
                const mediaGroup = Object.keys(funnel.data.cardFileIds).map(id => ({
                    type: 'photo',
                    media: funnel.data.cardFileIds[id],
                    caption: `Карта №${id}` // Короткая подпись для навигации
                }));

                // Отправляем альбом
                await ctx.replyWithMediaGroup(mediaGroup);

                // Отправляем кнопки выбора под альбомом
                await ctx.reply(
                    "Выберите номер карты, которая вам откликнулась:",
                    Markup.inlineKeyboard([
                        [1, 2, 3, 4].map(n => Markup.button.callback(`🃏 ${n}`, `mac_${n}`)),
                        [5, 6, 7].map(n => Markup.button.callback(`🃏 ${n}`, `mac_${n}`))
                    ])
                );
            }, 3000);
        });

        bot.action(/^mac_(\d+)$/, async (ctx) => {
            const cardNumber = ctx.match[1];
            const fileId = funnel.data.cardFileIds[cardNumber];
            const captionText = funnel.data.texts[cardNumber];

            await ctx.answerCbQuery();

            // Повторно присылаем выбранную карту крупно с полным описанием
            await ctx.replyWithPhoto(fileId, {
                caption: captionText + "\n\n✨ <i>Это ваш ключ к сегодняшнему состоянию.</i>",
                parse_mode: 'HTML'
            });

            setTimeout(() => {
                ctx.reply(
                    "Это лишь начало вашей истории. ✨\n\nГотовы составить свою <b>Картографию души</b>?\n\nНапишите мне напрямую: @sherab_wangmo",
                    { parse_mode: 'HTML' }
                );
            }, 4000);
        });
    }
};

module.exports = funnel;