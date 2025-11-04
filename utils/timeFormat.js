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

module.exports = {
   toMinutes,
   minutesToHHMM,
};
