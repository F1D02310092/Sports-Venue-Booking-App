document.addEventListener("DOMContentLoaded", () => {
   // 1. Cek apakah data analitik ada
   const data = window.analyticsData;
   if (!data) {
      console.error("Data analytics tidak ditemukan!");
      return;
   }

   // ============================================
   // 1. REVENUE CHART (Line Chart - Harian)
   // ============================================
   const revenueCanvas = document.getElementById("revenueChart");

   if (revenueCanvas && data.revenueByDate) {
      const revenueCtx = revenueCanvas.getContext("2d");

      const greenGradient = revenueCtx.createLinearGradient(0, 0, 0, 300);
      greenGradient.addColorStop(0, "rgba(65, 112, 79, 0.5)");
      greenGradient.addColorStop(1, "rgba(65, 112, 79, 0.0)");

      const revenueLabels = data.revenueByDate.map((item) => {
         const d = new Date(item._id);
         return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      });

      // Pastikan value adalah Number
      const revenueValues = data.revenueByDate.map((item) => Number(item.revenue));

      new Chart(revenueCtx, {
         type: "line",
         data: {
            labels: revenueLabels,
            datasets: [
               {
                  label: "Total Income",
                  data: revenueValues,
                  borderWidth: 3,
                  tension: 0.4,
                  borderColor: "#41704f",
                  backgroundColor: greenGradient,
                  pointBackgroundColor: "#d87142",
                  pointBorderColor: "#fff",
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  fill: true,
               },
            ],
         },
         options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
               legend: { display: false },
               tooltip: {
                  callbacks: {
                     label: (context) => " Income: Rp " + context.parsed.y.toLocaleString("id-ID"),
                  },
               },
            },
            scales: {
               y: {
                  beginAtZero: true,
                  grid: { borderDash: [5, 5], color: "#f0f0f0" },
                  ticks: {
                     callback: (value) => "Rp " + (value / 1000).toLocaleString("id-ID") + "k",
                  },
               },
               x: { grid: { display: false } },
            },
         },
      });
   }

   // ============================================
   // 2. INCOME BY COURT (Doughnut Chart)
   // ============================================
   const bookingCanvas = document.getElementById("bookingsChart");

   if (bookingCanvas && data.revenueByCourt && data.revenueByCourt.length > 0) {
      const bookingCtx = bookingCanvas.getContext("2d");

      const fieldNames = data.revenueByCourt.map((item) => {
         return item.fieldName || item._id || "Unknown Field";
      });

      // PERBAIKAN DISINI: Menggunakan item.revenue (sesuai log console Anda)
      const incomeByField = data.revenueByCourt.map((item) => Number(item.revenue));

      const chartColors = ["#41704f", "#d87142", "#24482e", "#ffc107", "#0dcaf0", "#6610f2", "#fd7e14", "#20c997"];

      new Chart(bookingCtx, {
         type: "doughnut",
         data: {
            labels: fieldNames,
            datasets: [
               {
                  label: "Income",
                  data: incomeByField,
                  backgroundColor: chartColors,
                  borderWidth: 2,
                  borderColor: "#ffffff",
                  hoverOffset: 4,
               },
            ],
         },
         options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            plugins: {
               legend: {
                  position: "bottom",
                  labels: {
                     usePointStyle: true,
                     padding: 20,
                     font: { family: "'Lexend Deca', sans-serif" },
                  },
               },
               tooltip: {
                  callbacks: {
                     label: function (context) {
                        let label = context.label || "";
                        if (label) {
                           label += ": ";
                        }
                        let value = context.parsed;
                        if (value !== null) {
                           label += new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value);
                        }
                        return label;
                     },
                  },
               },
            },
         },
      });
   }
});
