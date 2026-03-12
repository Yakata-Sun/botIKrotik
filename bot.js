require('dotenv').config();
const { Telegraf } = require("telegraf");
const config = require('./modules/config');
const storage = require('./modules/storage');
const ai = require('./modules/ai');
const menus = require('./modules/menus');
const handleMenu = require('./modules/handlers');
const registerCommands = require('./modules/commands');
const startBroadcast = require('./modules/broadcast');
const handleBroadcast = require('./modules/broadcastHandler');

const bot = new Telegraf(config.BOT_TOKEN);

let userSettings = storage.load(config.SETTINGS_FILE);
let userHistory = storage.load(config.HISTORY_FILE);

registerCommands(bot, userSettings);

bot.on('message', async (ctx) => {
   if (!ctx.message) return;

    const text = ctx.message.text;
    const userId = ctx.from.id;

    // 1. Инициализация (всегда первая)
if (!userSettings[userId]) {
    userSettings[userId] = { selectedModel: config.DEFAULT_MODEL, mode: 'short' };
    storage.save(config.SETTINGS_FILE, userSettings); // Сохраняем нового юзера сразу
}
    if (!userHistory[userId]) userHistory[userId] = [];

   // 2. ЛОГИКА РАССЫЛКИ (broadcastHandler.js)
    // Если функция вернула true, значит сообщение обработано как часть рассылки, стопаем выполнение
    const isBroadcastAction = await handleBroadcast(ctx, userSettings, menus, startBroadcast);
    if (isBroadcastAction) return;

    // 3. Если не в режиме рассылки
    if (!text) return; // Для ИИ нам нужен только текст
 // Сначала обрабатываем меню и кнопки переключения (они обновят userSettings в памяти)
    const menuHandled = await handleMenu(ctx, userSettings);
    if (menuHandled) return;
 // Проверяем, не выбрал ли пользователь новую модель прямо сейчас
    const selectedModelPath = config.MODELS[text]; 
    if (selectedModelPath) {
        userSettings[userId].selectedModel = selectedModelPath;
        storage.save(config.SETTINGS_FILE, userSettings);
        return await ctx.reply(`✅ Модель установлена`, menus.chatAI(userSettings[userId])); 
    }
    console.log(userSettings[userId].selectedModel);
// ОПРЕДЕЛЯЕМ МОДЕЛЬ ТОЛЬКО ТУТ, ПЕРЕД ВЫЗОВОМ ИИ Теперь здесь всегда будет актуальное значение
    const model = userSettings[userId].selectedModel || config.DEFAULT_MODEL;
    const isShortMode = userSettings[userId].mode === 'short';
    console.log(model);
    // 4. отправка запроса к ии
        try {
        await ctx.sendChatAction('typing');

        // 1. Добавляем вопрос пользователя ТОЛЬКО ОДИН РАЗ
        const userMsg = { role: 'user', content: text, timestamp: Date.now() };
        userHistory[userId].push(userMsg);

        const response = await ai.getAIResponse(
            userHistory[userId].slice(-config.MAX_HISTORY), 
            model, 
            isShortMode
        );
        
        const choice = response.data.choices?.[0];
        const answer = (choice?.message?.content || "").trim();

        if (answer) {
            // 2. Добавляем ответ ИИ
            userHistory[userId].push({ role: 'assistant', content: answer, timestamp: Date.now() });
            storage.save(config.HISTORY_FILE, userHistory);
            await ctx.reply(answer, menus.chatAI(userSettings[userId]));
        } else {
            userHistory[userId].pop(); // Удаляем последний вопрос, если ответа нет
            await ctx.reply("🤖 ИИ прислал пустой ответ. Попробуйте еще раз.");
        }
    } catch (e) {
        userHistory[userId].pop(); // Удаляем вопрос при ошибке сети
        console.error('Ошибка ИИ:', e.message);
        await ctx.reply("⚠️ Ошибка связи. Попробуйте другую модель.");
    }
});

bot.launch().then(() => console.log('🚀 Бот запущен!'));