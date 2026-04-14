const config = require('./config');
const { Markup } = require('telegraf');

/**
 * @module Menus
 * @description Оптимизированная навигация: фокус на конверсию и боли клиента.
 */

module.exports = {
    /**
     * Главное меню (Home Screen)
     * Задача: Максимально быстро вовлечь в бесплатный полезный продукт (Чекап).
     */
    main: (isAdmin = false, userCount = 0) => {
        let keyboard = [
            [{ text: '🔮 Узнать свой Путь (Чекап)' }], // Самая большая кнопка-магнит
            [{ text: '🎭 Мои Услуги' }, { text: '✍️ Задать вопрос' }],
            [{ text: '❓ Справка' }]
        ];

        if (isAdmin) {
            keyboard.push([{ text: `⚙️ Админ-панель (${userCount})` }]);
        }

        return {
            reply_markup: {
                keyboard: keyboard,
                resize_keyboard: true,
                is_persistent: true
            }
        };
    },

    /**
     * Меню Услуг (Product Catalog)
     * Задача: Разделить направления, чтобы клиент не "разбрасывался".
     */
    buy: () => ({
        reply_markup: {
            keyboard: [
                [{ text: '✨ Самопознание и Сказки' }], // Основной продукт
                [{ text: '💻 IT-разработка (Боты/Сайты)' }], // Вторичный продукт
                [{ text: '⬅️ В главное меню' }]
            ],
            resize_keyboard: true
        }
    }),

    /**
     * Список тренингов (Coaching Products)
     * Задача: Показать путь от простого к сложному.
     */
    trainings: () => ({
        reply_markup: {
            keyboard: [
                [{ text: '📈 Карта Пути (Сессия)' }, { text: '✨ Курс-Путешествие' }],
                [{ text: '🔮 Повторить Чекап' }, { text: '⬅️ Назад в услуги' }]
            ],
            resize_keyboard: true
        }
    }),

    /**
     * IT-услуги (Dev Products)
     */
    dev: () => ({
        reply_markup: {
            keyboard: [
                [{ text: '🤖 Создание ботов' }, { text: '⚙️ Web-разработка' }],
                [{ text: '⬅️ Назад в услуги' }]
            ],
            resize_keyboard: true
        }
    }),

    /**
     * Админ-панель (Admin UI)
     */
    adminPanel: (userCount = 0) => ({
        reply_markup: {
            keyboard: [
                [{ text: '📢 Рассылка' }],
                [{ text: '🤖 Настройки ИИ' }],
                [{ text: '⬅️ В главное меню' }]
            ],
            resize_keyboard: true
        }
    }),

    /* /**
     * Настройка ИИ для админа
    
    chatAI: (settings = {}) => {
        const isShort = settings.mode === 'short';
        const isSearch = settings.useSearch === true;

        return {
            reply_markup: {
                keyboard: [
                    [
                        { text: isSearch ? '✅ Поиск: ВКЛ' : '🌍 Поиск: ВЫКЛ' },
                        { text: isShort ? '✅ Кратко' : '⚡️ Кратко' }
                    ],
                    [{ text: '🤖 Сменить модель' }, { text: '🧹 Очистить контекст' }],
                    [{ text: '⬅️ Назад в админку' }]
                ],
                resize_keyboard: true
            }
        };
    }, */

    confirmBroadcast: () => ({
        reply_markup: {
            keyboard: [
                [{ text: '✅ Отправить всем' }, { text: '❌ Отмена' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    }),

    ai: () => {
        const modelButtons = Object.keys(config.MODELS).map(name => [{ text: name }]);
        return {
            reply_markup: {
                keyboard: [
                    ...modelButtons,
                    [{ text: '⬅️ Назад' }]
                ],
                resize_keyboard: true
            }
        };
    }
};