document.addEventListener("DOMContentLoaded", () => {
   const data = window.analyticsData;

   const revenueCtx = document.getElementById("revenueChart").getContext("2d");

   const greenGradient = revenueCtx.createLinearGradient(0, 0, 0, 300);
   greenGradient.addColorStop(0, "rgba(0, 255, 68, 0.6)");
   greenGradient.addColorStop(1, "rgba(181, 182, 181, 0)");

   const revenueLabels = data.revenueByDate.map((item) => item._id);
   const revenueValues = data.revenueByDate.map((item) => item.revenue);

   new Chart(revenueCtx, {
      type: "line",
      data: {
         labels: revenueLabels,
         datasets: [
            {
               label: "Revenue",
               data: revenueValues,
               borderWidth: 2,
               tension: 0.4,
               borderColor: "#28db58ff",
               backgroundColor: greenGradient,
               fill: true, // penting agar gradient muncul
            },
         ],
      },
      options: {
         responsive: true,
         scales: {
            y: {
               beginAtZero: true,
               ticks: {
                  callback: (value) => "Rp " + value.toLocaleString("id-ID"),
                  min: 0,
                  stepSize: 50000,
               },
            },
         },
      },
   });

   const bookingCtx = document.getElementById("bookingsChart").getContext("2d");
   const bookingValues = data.revenueByDate.map((item) => item.bookings);

   const barColor = "rgba(54, 162, 235, 0.6)";
   const barBorder = "rgb(54, 162, 235)";

   new Chart(bookingCtx, {
      type: "bar",
      data: {
         labels: revenueLabels,
         datasets: [
            {
               label: "Bookings",
               data: bookingValues,
               borderWidth: 1,
               backgroundColor: barColor,
               borderColor: barBorder,
            },
         ],
      },
      options: {
         responsive: true,
         scales: {
            y: {
               beginAtZero: true,
               ticks: {
                  stepSize: 1,
                  min: 0,
               },
            },
         },
      },
   });
});
