document.addEventListener("DOMContentLoaded", () => {
   flatpickr("#field-open", {
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i",
      time_24hr: true,
      minuteIncrement: 10,
   });
   flatpickr("#field-close", {
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i",
      time_24hr: true,
      minuteIncrement: 10,
   });
});
