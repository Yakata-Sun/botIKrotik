const fs = require('fs');
const config = require('./config');

/**
 * @module Storage
 * @description Модуль для работы с локальной базой данных в формате JSON и управления жизненным циклом данных.
 */
const storage = {
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
    }
};

module.exports = storage;