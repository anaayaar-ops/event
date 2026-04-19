import 'dotenv/config';
import fs from 'fs';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();

// القائمة الكاملة (32 اسم) كما وردت في طلبك وملف h11/h12
const eventNames = [
    "سوالف وافكار", "تحديات", "ساعة تسلية", "شغّل عقلك", "سوالف ونقاشات", "لعب وطرب", 
    "خمن الرقم", "سوالف صباحيه", "تحديات خليجنا ذوق", "تحديات ذهنية", "تحدي التخمين", 
    "صباحيات خليجنا ذوق", "تصادمات رقمية", "جيبها بالثانيه", "سوالف والعاب", "تحدي سهم",
    "فـ الصحيح", "رتب الحروف", "جلسات حوارية", "منوعات", "تحدي كرة", "سوالف خليجنا ذوق",
    "تحديات منوعة", "تحديات رقمية", "ساعه نقاش", "فقرات منوعة", "أرقام الحظ", "تحدي الزمن",
    "سوالف ليل", "تحدي الأرقام", "تحديات بوتات", "صناديق الحظ"
];

const formatAMPM = (date) => {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes}${ampm}`;
};

service.on('ready', async () => {
    console.log(`✅ تم تسجيل الدخول: ${service.currentSubscriber.nickname}`);
    
    const targetGroup = 18432094;
    const totalEvents = 32;
    let startTime = new Date(2026, 3, 20, 21, 0, 0); // تبدأ من 12:00 AM يوم 18 فبراير
    const surveyRecords = [];

    try {
        console.log("🔍 فحص التعارض في الروم...");
        const listRes = await service.websocket.emit('group event list', { groupId: targetGroup, languageId: 1 });
        const existingEvents = listRes.success ? listRes.body : [];

        for (let i = 0; i < totalEvents; i++) {
            const title = eventNames[i];
            const endTime = new Date(startTime.getTime() + 45 * 60000);

            // فحص إذا كان الوقت محجوز
            const isConflicting = existingEvents.some(event => {
                const eStart = new Date(event.startsAt).getTime();
                const eEnd = new Date(event.endsAt).getTime();
                return (startTime.getTime() < eEnd && endTime.getTime() > eStart);
            });

            if (isConflicting) {
                console.log(`⚠️ تجاوز [${title}]: الوقت ${formatAMPM(startTime)} محجوز.`);
            } else {
                const response = await service.websocket.emit('group event create', {
                    groupId: targetGroup,
                    title: title,
                    startsAt: startTime.toISOString(),
                    endsAt: endTime.toISOString(),
                    category: 1, // Challenge
                    languageId: 1
                });

                if (response.success) {
                    const fDate = `${startTime.getDate()}/${startTime.getMonth() + 1}/${startTime.getFullYear()}`;
                    const fTime = formatAMPM(startTime);

                    // تخزين البيانات بنظام الاختيار الدوري للاستبيان
                    surveyRecords.push({
                        membership: "224",
                        room: "18432094",
                        isWeekly: "نعم",
                        choiceIndex: i, // سيختار الخيار 1، ثم 2، وهكذا في المتصفح
                        date: fDate,
                        time: fTime,
                        id: response.body.id.toString()
                    });
                    console.log(`🚀 تم الرفع: ${title} | الوقت: ${fTime} | ID: ${response.body.id}`);
                }
            }
            startTime = new Date(endTime.getTime());
        }

        // إنشاء ملف البيانات للمتصفح
        const jsData = `const allEvents = ${JSON.stringify(surveyRecords, null, 2)};`;
        fs.writeFileSync('./survey_data.js', jsData, 'utf8');
        console.log("🏁 انتهى الرفع. ملف survey_data.js جاهز للاستخدام.");

    } catch (err) {
        console.error("❌ خطأ:", err.message);
    }
    process.exit();
});


service.login(process.env.U_MAIL, process.env.U_PASS);


























