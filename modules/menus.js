const config = require('./config');

/**
 * @module Menus
 * @description Генератор экранных клавиатур (Reply Keyboards) для интерфейса бота.
 */

module.exports = {
    /**
     * Главное меню (корневой уровень).
     * @returns {Object} Объект с reply_markup для Telegraf.
     */
    main: () => ({
        reply_markup: {
            keyboard: [
                [{ text: '💎 Услуги' }, { text: '✍️ Задать вопрос'}],
                [{ text: '❓ Справка'}, { text: '🤖 Спросить ИИ' }]
            ],
            resize_keyboard: true,
            is_persistent: true
        }
    }),

    /**
     * Меню режима чата с ИИ. Отображает переключатели краткости ответов.
     * @param {Object} settings - Объект настроек текущего пользователя.
     * @returns {Object} Объект с кнопками выбора режима и смены модели.
     */
    chatAI: (settings = {}) => {
        const isShort = settings.mode === 'short'; 
        return {
            reply_markup: {
                keyboard: [
                    [
                        { text: isShort ? '✅ ⚡️ Быстро' : '⚡️ Быстро (Кратко)' },
                        { text: !isShort ? '✅ 📚 Подробно' : '📚 Подробно (Детально)' }
                    ],
                     [{ text: '🤖 Сменить модель' }, { text: '🧹 Очистить контекст' }], 
                [{ text: '⬅️ Назад' }]
                ],
                resize_keyboard: true,
                persistent: true
            }
        };
    },

    /**
     * Список доступных моделей нейросетей, формируемый динамически из конфига.
     * @returns {Object} Клавиатура со списком всех подключенных AI-моделей.
     */
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
     * Выбор категории услуг (Уровень 1).
     * @returns {Object} Клавиатура с разделами "Тренинги" и "Разработка".
     */
    buy: () => ({
        reply_markup: {
            keyboard: [
                [{ text: '🎓 Тренинги' }, { text: '💻 Разработка' }],
                [{ text: '⬅️ Назад' }]
            ],
            resize_keyboard: true,
            persistent: true 
        }
    }),

    /**
     * Список тренингов (Уровень 2).
     * @returns {Object} Клавиатура с конкретными продуктами Марии.
     */
    trainings: () => ({
        reply_markup: {
            keyboard: [
                [{ text: '✨ Личная Сказка' }, { text: '📈 Быстрый Коучинг' }],
                [{ text: '⬅️ Назад в услуги' }]
            ],
            resize_keyboard: true,
            persistent: true 
        }
    }),

    /**
     * Услуги по разработке (Уровень 2).
     * @returns {Object} Клавиатура с IT-услугами.
     */
    dev: () => ({
        reply_markup: {
            keyboard: [
                [{ text: '🤖 Создание ботов' }, { text: '⚙️ Создание лендинга' }],
                [{ text: '🤖 Доработка ботов' }, { text: '⚙️ Web-разработка' }],
                [{ text: '⬅️ Назад в услуги' }]
            ],
            resize_keyboard: true
        }
    }),

    /**
     * Кнопки подтверждения для администратора перед запуском массовой рассылки.
     * @returns {Object} Клавиатура "Отправить всем / Отмена".
     */
    confirmBroadcast: () => ({
        reply_markup: {
            keyboard: [
                [{ text: '✅ Отправить всем' }, { text: '❌ Отмена' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    })
};