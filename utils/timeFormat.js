function toMinutes(timeStr) {
   if (typeof timeStr !== "string") {
      throw new Error("Invalid time format");
   }

   const [hours, minutes] = timeStr.split(":").map(Number);

   if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error("Invalid time value");
   }

   return hours * 60 + minutes;
}

function minutesToHHMM(m) {
   const h = String(Math.floor(m / 60)).padStart(2, "0");
   const mm = String(m % 60).padStart(2, "0");
   return `${h}:${mm}`;
}

function formatDateYYYYMMDD(date) {
   const y = date.getFullYear();
   const m = String(date.getMonth() + 1).padStart(2, "0");
   const d = String(date.getDate()).padStart(2, "0");
   return `${y}-${m}-${d}`;
}

function parseLocalDateToUTC(dateStr) {
   // dateStr: "YYYY-MM-DD" (dari <input type="date">, zona lokal browser)
   const [y, m, d] = dateStr.split("-").map(Number);
   const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)); // UTC midnight
   return dt;
}

function getTodayInWITA() {
   const now = new Date();
   // UTC+8 → 8 jam * 60 * 60 * 1000
   const witaOffsetMs = 8 * 60 * 60 * 1000;
   const witaDate = new Date(now.getTime() + witaOffsetMs);
   witaDate.setUTCHours(0, 0, 0, 0);
   return witaDate;
}

function createWITATime() {
   const now = new Date();

   return now;
}

module.exports = {
   toMinutes,
   minutesToHHMM,
   formatDateYYYYMMDD,
   parseLocalDateToUTC,
   getTodayInWITA,
   createWITATime,
};
