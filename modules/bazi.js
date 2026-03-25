/**
 * @module BaziCalculator
 * @description Модуль для точного расчета четырех столпов судьбы (Ба-Цзы) 
 * с использованием китайского солнечного календаря.
 */

const { Solar } = require('lunar-javascript');

/**
 * Словарь соответствия китайских иероглифов (Стволов и Ветвей) 
 * их русским названиям и стихиям.
 * @const {Object<string, string>}
 */
const elementsMap = {
    '甲': 'Дерево Ян (Цзя)', '乙': 'Дерево Инь (И)', '丙': 'Огонь Ян (Бин)', '丁': 'Огонь Инь (Дин)',
    '戊': 'Земля Ян (У)', '己': 'Земля Инь (Цзи)', '庚': 'Металл Ян (Гэн)', '辛': 'Металл Инь (Синь)',
    '壬': 'Вода Ян (Жэнь)', '癸': 'Вода Инь (Гуй)',
    '子': 'Крыса (Вода)', '丑': 'Бык (Земля)', '寅': 'Тигр (Дерево)', '卯': 'Кролик (Дерево)',
    '辰': 'Дракон (Земля)', '巳': 'Змея (Огонь)', '午': 'Лошадь (Огонь)', '未': 'Коза (Земля)',
    '申': 'Обезьяна (Металл)', '酉': 'Петух (Металл)', '戌': 'Собака (Земля)', '亥': 'Свинья (Вода)'
};

/**
 * Вспомогательная функция для форматирования иероглифического столпа в текст.
 * @param {string} p - Строка из двух иероглифов (Ствол + Ветвь).
 * @returns {string} Читаемое описание столпа.
 */
const formatPillar = (p) => {
    if (!p || p.length < 2) return "Не определен";
    const gan = p.substring(0, 1); // Верхний иероглиф (Небесный ствол)
    const zhi = p.substring(1, 2); // Нижний иероглиф (Земная ветвь)
    return `${elementsMap[gan]} на ${elementsMap[zhi]}`;
};

module.exports = {
    /**
     * Выполняет полный расчет карты Ба-Цзы на основе текстового ввода.
     * Автоматически извлекает дату и время из строки.
     * 
     * @param {string} text - Текст сообщения пользователя (например, "26.08.1983 14:30").
     * @returns {Object|null} Объект с расчетом или null, если дата не найдена.
     */
    calculate: (text) => {
        try {
            /** 
             * Извлекаем дату: ищем ДД.ММ.ГГГГ или ДД/ММ/ГГГГ 
             * @type {RegExpMatchArray|null} 
             */
            const dateMatch = text.match(/(\d{2})[./-](\d{2})[./-](\d{4})/);
            
            /** 
             * Извлекаем время: строго ЧЧ:ММ (чтобы не путать с числами даты)
             * @type {RegExpMatchArray|null} 
             */
            const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
            
            if (!dateMatch) return null;

            // Парсим компоненты даты
            const d = parseInt(dateMatch[1]);
            const m = parseInt(dateMatch[2]);
            const y = parseInt(dateMatch[3]);

            // Логика определения времени: если не указано, используем полдень (12:00)
            let hour = 12;
            let minute = 0;

            if (timeMatch) {
                const h = parseInt(timeMatch[1]);
                const min = parseInt(timeMatch[2]);
                // Валидация часа (от 0 до 23)
                if (h >= 0 && h < 24) {
                    hour = h;
                    minute = min;
                }
            }

            /** 
             * Создаем объект солнечной даты и конвертируем в лунный календарь 
             * для получения иероглифов GanZhi (Гань-Чжи).
             */
            const solar = Solar.fromYmdHms(y, m, d, hour, minute, 0);
            const lunar = solar.getLunar();

            // Получаем 4 столпа в виде иероглифов через библиотеку lunar-javascript
            const yearP = lunar.getYearInGanZhi();   // Год
            const monthP = lunar.getMonthInGanZhi(); // Месяц
            const dayP = lunar.getDayInGanZhi();     // День
            const hourP = lunar.getTimeInGanZhi();   // Час

            /**
             * Формируем итоговый объект данных.
             * Master (Господин Дня) — это Небесный Ствол (первый иероглиф) дня.
             */
            return {
                master: elementsMap[dayP.substring(0, 1)], 
                pillars: {
                    year: formatPillar(yearP),
                    month: formatPillar(monthP),
                    day: formatPillar(dayP),
                    hour: timeMatch ? formatPillar(hourP) : "Час не указан (взят средний)"
                },
                isTimeExact: !!timeMatch // Флаг точности для ИИ
            };
        } catch (e) {
            console.error("❌ Ошибка в модуле Bazi Calculator:", e.message);
            return null;
        }
    }
};