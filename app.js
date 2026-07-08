import 'dotenv/config';
import fs from 'fs';
import sharp from 'sharp';
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
    let startTime = new Date(2026, 6, 11, 21, 0, 0); // تبدأ من 12:00 AM يوم 18 فبراير
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

            
            startTime = new Date(endTime.getTime());
        }

        // ============ رفع الصور بعد ما خلصت كل الفعاليات ============
        console.log("\n🖼️ جاري رفع الصور لكل الفعاليات...");

        const imagePath = './178332617173751.jpeg'; // 👈 غيّر الاسم لو غيرت الصورة
        if (fs.existsSync(imagePath)) {
            const thumbnailBuffer = await sharp(imagePath).jpeg({ quality: 90 }).toBuffer();

            for (const record of surveyRecords) {
                try {
                    const imageResponse = await service.event.group.updateThumbnail(
                        parseInt(record.id),
                        thumbnailBuffer
                    );
                    console.log(imageResponse.success
                        ? `🖼️ تم رفع صورة: ID ${record.id}`
                        : `⚠️ فشلت صورة ID ${record.id}: ${JSON.stringify(imageResponse)}`
                    );
                } catch (err) {
                    console.error(`❌ خطأ برفع صورة ID ${record.id}:`, err.message);
                }
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        } else {
            console.error(`❌ الصورة غير موجودة بالمسار: ${imagePath}`);
        }

    } catch (err) {
        console.error("❌ خطأ:", err.message);

    }
    process.exit();
});


service.login(process.env.U_MAIL, process.env.U_PASS);
