const config = require('./config');
const { Markup } = require('telegraf'); // Добавь импорт Markup, если используешь inline-кнопки

/**
 * @module Menus
 * @description Обновленное меню: ИИ скрыт в воронку Астро-чекапа.
 */

module.exports = {
     /**
     * @param {boolean} isAdmin - Флаг администратора
     * @param {number} userCount - Количество людей в базе (для кнопки админа)
     */
    main: (isAdmin = false) => {
        let keyboard = [
            [{ text: '💎 Услуги' }, { text: '✍️ Задать вопрос' }],
            [{ text: '❓ Справка' }]
        ];

        // Только админу (тебе) показываем кнопку прямого входа в ИИ-чат/Поиск
        if (isAdmin) {
            keyboard[1].push({ text: '⚙️ Админ-панель' });
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
     * Внутреннее меню Админ-панели
     */
    adminPanel: (userCount = 0) => ({
        reply_markup: {
            keyboard: [
                [{ text: `📢 Рассылка (${userCount} чел.)` }],
                [{ text: '🤖 Настройки ИИ' }],
                [{ text: '⬅️ Назад' }]
            ],
            resize_keyboard: true
        }
    }),
    //Меню настройки личного ИИ
    chatAI: (settings = {}) => {
    const isShort = settings.mode === 'short';
    const isSearch = settings.useSearch === true; // Новый флаг в настройках

    return {
        reply_markup: {
            keyboard: [
                [
                    { text: isSearch ? '✅ 🌍 Поиск: ВКЛ' : '🌍 Поиск: ВЫКЛ' },
                    { text: isShort ? '✅ ⚡️ Кратко' : '⚡️ Кратко' }
                ],
                [{ text: '🤖 Сменить модель' }, { text: '🧹 Очистить контекст' }],
                [{ text: '⬅️ Назад в админку' }]
            ],
            resize_keyboard: true
        }
    };
},
 /**
     * Кнопки подтверждения перед запуском рассылки.
     * @returns {Object} Reply Keyboard.
     */
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
    },

    /**
     * Список тренингов и воронки.
     * Астро-чекап теперь — главная точка входа в ИИ для клиентов.
     */
    trainings: () => ({
        reply_markup: {
            keyboard: [
                [{ text: '✨ Личная Сказка' }, { text: '📈 Быстрый Коучинг' }],
                [{ text: '🔮 Астро-чекап' }, { text: '⬅️ Назад в услуги' }]
            ],
            resize_keyboard: true,
            persistent: true 
        }
    }),

    buy: () => ({
        reply_markup: {
            keyboard: [
                [{ text: '📈 Коучинг' }, { text: '💻 Разработка' }],
                [{ text: '⬅️ Назад' }]
            ],
            resize_keyboard: true
        }
    }),

    dev: () => ({
        reply_markup: {
            keyboard: [
                [{ text: '🤖 Создание ботов' }, { text: '⚙️ Создание лендинга' }],
                [{ text: '⬅️ Назад в услуги' }]
            ],
            resize_keyboard: true
        }
    })
};