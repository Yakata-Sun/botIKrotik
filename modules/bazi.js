const { Solar } = require('lunar-javascript');

const elementsMap = {
    '甲': 'Дерево Ян (Цзя)', '乙': 'Дерево Инь (И)', '丙': 'Огонь Ян (Бин)', '丁': 'Огонь Инь (Дин)',
    '戊': 'Земля Ян (У)', '己': 'Земля Инь (Цзи)', '庚': 'Металл Ян (Гэн)', '辛': 'Металл Инь (Синь)',
    '壬': 'Вода Ян (Жэнь)', '癸': 'Вода Инь (Квей)',
    '子': 'Крыса (Вода)', '丑': 'Бык (Земля)', '寅': 'Тигр (Дерево)', '卯': 'Кролик (Дерево)',
    '辰': 'Дракон (Земля)', '巳': 'Змея (Огонь)', '午': 'Лошадь (Огонь)', '未': 'Коза (Земля)',
    '申': 'Обезьяна (Металл)', '酉': 'Петух (Металл)', '戌': 'Собака (Земля)', '亥': 'Свинья (Вода)'
};

module.exports = {
    calculate: (text) => {
        try {
            // 1. Ищем дату (ДД.ММ.ГГГГ)
            const dateMatch = text.match(/(\d{2})[./-](\d{2})[./-](\d{4})/);
            // 2. Ищем время СТРОГО через двоеточие (ЧЧ:ММ), чтобы не путать с числами даты
            const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
            
            if (!dateMatch) return null;

            const d = parseInt(dateMatch[1]);
            const m = parseInt(dateMatch[2]);
            const y = parseInt(dateMatch[3]);

            // Если время не найдено, ставим 12:00 (полдень)
            let hour = 12;
            let minute = 0;

            if (timeMatch) {
                const h = parseInt(timeMatch[1]);
                const min = parseInt(timeMatch[2]);
                // Валидация: час не может быть больше 23
                if (h >= 0 && h < 24) {
                    hour = h;
                    minute = min;
                }
            }

            const solar = Solar.fromYmdHms(y, m, d, hour, minute, 0);
            const lunar = solar.getLunar();

            const yearP = lunar.getYearInGanZhi();
            const monthP = lunar.getMonthInGanZhi();
            const dayP = lunar.getDayInGanZhi();
            const hourP = lunar.getTimeInGanZhi(); 

            const formatPillar = (p) => {
                if (!p || p.length < 2) return "Не определен";
                return `${elementsMap[p[0]]} на ${elementsMap[p[1]]}`;
            };

            return {
                master: elementsMap[dayP[0]], 
                pillars: {
                    year: formatPillar(yearP),
                    month: formatPillar(monthP),
                    day: formatPillar(dayP),
                    hour: timeMatch ? formatPillar(hourP) : "Час не указан (взят средний)"
                }
            };
        } catch (e) {
            console.error("Bazi Calculation Error:", e.message);
            return null;
        }
    }
};