async function downloadPDF(orderID, btn) {
   try {
      const { jsPDF } = window.jspdf;
      const element = document.getElementById("receipt-content");

      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
      btn.disabled = true;

      const canvas = await html2canvas(element, {
         scale: 2,
         // useCORS: true,
         // logging: false,
         backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", [canvas.height * 0.35, canvas.width * 0.35]);

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

      pdf.save(`Receipt-${orderID}.pdf`);

      btn.innerHTML = originalText;
      btn.disabled = false;
   } catch (error) {
      console.error(error);

      btn.innerHTML = "Download PDF";
      btn.disabled = false;
   }
}

async function downloadJPG(orderID, btn) {
   try {
      const element = document.getElementById("receipt-content");

      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
      btn.disabled = true;

      const canvas = await html2canvas(element, {
         scale: 5,
         // useCORS: true,
         // logging: false,
         backgroundColor: "#ffffff",
         onclone: function (clonedDoc) {
            const clonedElement = clonedDoc.getElementById("receipt-content");
            clonedElement.style.width = "400px";
            clonedElement.style.margin = "0 auto";
         },
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0);

      const link = document.createElement("a");
      link.download = `Receipt-${orderID}.jpg`;
      link.href = imgData;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      btn.innerHTML = originalText;
      btn.disabled = false;
   } catch (error) {
      console.error(error);

      btn.innerHTML = "Download JPG";
      btn.disabled = false;
   }
}
