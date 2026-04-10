const fs = require('fs');
const config = require('./config');

/**
 * @module Storage
 * @description Модуль для работы с локальной базой данных в формате JSON и управления жизненным циклом данных.
 */
const storage = {
    /**
 * Получает количество уникальных пользователей
 * @returns {number} Количество пользователей
 */
getUserCount() {
    try {
        // Проверяем settings.json - там хранятся профили пользователей
        if (fs.existsSync(config.SETTINGS_FILE)) {
            const settings = JSON.parse(fs.readFileSync(config.SETTINGS_FILE, 'utf8'));
            if (typeof settings === 'object' && settings !== null) {
                return Object.keys(settings).length;
            }
        }
        
        // Альтернативно, можно проверить history.json
        if (fs.existsSync(config.HISTORY_FILE)) {
            const history = JSON.parse(fs.readFileSync(config.HISTORY_FILE, 'utf8'));
            if (typeof history === 'object' && history !== null) {
                return Object.keys(history).length;
            }
        }
        
        return 0;
    } catch (e) {
        console.error('Ошибка при подсчете пользователей:', e);
        return 0;
    }
},
/**
 * Получает список всех пользователей с их данными
 * @returns {Object} Объект с данными пользователей
 */
getAllUsers() {
    try {
        if (fs.existsSync(config.SETTINGS_FILE)) {
            return JSON.parse(fs.readFileSync(config.SETTINGS_FILE, 'utf8'));
        }
        return {};
    } catch (e) {
        console.error('Ошибка при получении списка пользователей:', e);
        return {};
    }
},
    /**
     * Загружает данные из JSON-файла.
     * @param {string} file - Путь к файлу базы данных.
     * @returns {Object|Array} Спарсенные данные или пустой объект при ошибке/отсутствии файла.
     */
    load(file) {
        try {
            return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
        } catch (e) {
            console.error(`Ошибка загрузки ${file}:`, e);
            return {};
        }
    },

    /**
     * Сохраняет данные в JSON-файл. 
     * Если сохраняется файл истории, автоматически запускает очистку старых записей.
     * @param {string} file - Путь к файлу.
     * @param {Object} data - Объект данных для записи.
     */
    save(file, data) {
        try {
            // Если мы сохраняем историю переписки, сначала чистим её
            if (file === config.HISTORY_FILE) {
                this.cleanOldHistory(data);
            }
            fs.writeFileSync(file, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error(`Ошибка сохранения ${file}:`, e);
        }
    },

    /**
     * Удаляет из истории сообщения старше указанного в конфиге количества дней.
     * @private
     * @param {Object} userHistory - Общий объект истории всех пользователей.
     */
    cleanOldHistory(userHistory) {
        const now = Date.now();
        const maxAge = config.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000;

        for (const userId in userHistory) {
            if (Array.isArray(userHistory[userId])) {
                userHistory[userId] = userHistory[userId].filter(msg => {
                    // Если у сообщения нет метки времени, оставляем его (совместимость)
                    if (!msg.timestamp) return true;
                    // Оставляем только "свежие" сообщения
                    return (now - msg.timestamp) < maxAge;
                });

                // Если после чистки у юзера пусто — удаляем его запись совсем
                if (userHistory[userId].length === 0) {
                    delete userHistory[userId];
                }
            }
        }
    },
    /**
 * Получает состояние пользователя
 * @param {number|string} userId - ID пользователя
 * @returns {Object|null} Состояние пользователя или null
 */
getUserState (userId) {
    try {
        const settings = this.load(config.SETTINGS_FILE);
        return settings[userId] || null;
    } catch (e) {
        console.error('Ошибка при получении состояния пользователя:', e);
        return null;
    }
},

/**
 * Сохраняет состояние пользователя
 * @param {number|string} userId - ID пользователя
 * @param {Object} state - Объект состояния для сохранения
 */
saveUserState (userId, state) {
    try {
        const settings = this.load(config.SETTINGS_FILE);
        settings[userId] = { ...settings[userId], ...state };
        this.save(config.SETTINGS_FILE, settings);
    } catch (e) {
        console.error('Ошибка при сохранении состояния пользователя:', e);
    }
},

/**
 * Получает настройки пользователя
 * @param {number|string} userId - ID пользователя
 * @returns {Object} Настройки пользователя или пустой объект
 */
getUserSettings(userId) {
    try {
        const settings = this.load(config.SETTINGS_FILE);
        return settings[userId] || {};
    } catch (e) {
        console.error('Ошибка при получении настроек пользователя:', e);
        return {};
    }
},

/**
 * Обновляет настройки пользователя
 * @param {number|string} userId - ID пользователя
 * @param {Object} updates - Объект с обновлениями настроек
 */
updateUserSetting(userId, updates) {
    try {
        const settings = this.load(config.SETTINGS_FILE);
        if (!settings[userId]) {
            settings[userId] = {};
        }
        Object.assign(settings[userId], updates);
        this.save(config.SETTINGS_FILE, settings);
    } catch (e) {
        console.error('Ошибка при обновлении настроек пользователя:', e);
    }
},

/**
 * Сбрасывает флаг ожидания чека для пользователя
 * @param {number|string} userId - ID пользователя
 */
resetAwaitingReceipt(userId) {
    this.updateUserSetting(userId, { awaitingReceipt: false });
},

/**
 * Устанавливает флаг ожидания чека для пользователя
 * @param {number|string} userId - ID пользователя
 */
setAwaitingReceipt(userId) {
    this.updateUserSetting(userId, { 
        awaitingReceipt: true,
        paymentStep: 'waiting_receipt'
    });
}
};

module.exports = storage;