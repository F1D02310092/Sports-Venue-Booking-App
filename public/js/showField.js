// AKAN DIHAPUS SETELAH ADA HANDLE BOOKING DI BACKEND
document.querySelector("#form-booking").addEventListener("submit", (evt) => {
   const checkedSlots = document.querySelectorAll('input[name="slots"]:checked'); // HTML Nodelist
   console.log(checkedSlots);

   const selectedTimes = Array.from(checkedSlots).map((el) => el.id.replace("slot-", ""));
   // karena format id slot: "slot-${waktu}", maka hapus "slot-", sehingga tersisa Number ${waktu} saja
   console.log(selectedTimes);

   const startTime = selectedTimes[0]; // start slot pertama
   const endTime = Number(selectedTimes[selectedTimes.length - 1]) + 60; // handle booking banyak slot

   console.log("Start:", startTime);
   console.log("End:", endTime);
});

const bookingDatePicker = document.querySelector("#booking-date-picker");
const selectedBookingDate = document.querySelector("#selected-booking-date");
const selectedDate = document.querySelector("#selected-date");
const formBooking = document.querySelector("#form-booking");
const fieldID = document.querySelector("#field-id").value;

function formattedDate(dateString) {
   const date = new Date(dateString);
   return date.toLocaleDateString("en-EN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
   });
}

bookingDatePicker.addEventListener("change", function (evt) {
   const newDate = this.value;

   selectedBookingDate.value = newDate;
   selectedDate.textContent = formattedDate(newDate);
   formBooking.innerHTML = "<p><em>Loading...</em></p>";

   window.location.href = `/fields/${fieldID}?date=${newDate}`;
});

document.addEventListener("DOMContentLoaded", () => {
   const url = new URL(window.location.href);
   const today = new Date().toISOString().split("T")[0]; // format YYYY-MM-DD
   const currentDateParam = url.searchParams.get("date");

   // Jika user baru saja merefresh halaman DAN ada param date yang bukan hari ini,
   // maka ubah URL agar kembali ke hari ini.
   if (performance.navigation.type === performance.navigation.TYPE_RELOAD) {
      if (currentDateParam !== today) {
         // Ganti tanggal di URL menjadi hari ini
         url.searchParams.set("date", today);
         formBooking.innerHTML = "<p><em>Loading...</em></p>";
         window.location.replace(url.toString());
      }
   }
});
