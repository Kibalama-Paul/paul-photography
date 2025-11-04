// script.js - plain JS file (no <script> tags)
const form = document.getElementById("whatsappForm");
form?.addEventListener("submit", function(e) {
  e.preventDefault();

  const clientName = document.getElementById("name")?.value?.trim() || "";
  const clientEmail = document.getElementById("email")?.value?.trim() || "";
  const datetime = document.getElementById("datetime")?.value || "";
  const shootType = document.getElementById("shootType")?.value || "";

  // Send data to your server
  fetch("save_booking.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      name: clientName,
      email: clientEmail,
      datetime: datetime,
      shootType: shootType
    }).toString()
  }).catch(console.error);

  // Send to WhatsApp
  const message = `Hello Paul Photography,%0A%0AI would like to book a photoshoot.%0A%0AName: ${encodeURIComponent(clientName)}%0AEmail: ${encodeURIComponent(clientEmail)}%0ADate & Time: ${encodeURIComponent(datetime)}%0AShoot Type: ${encodeURIComponent(shootType)}%0A%0AThank you!`;
  const whatsappNumber = "256757460297";
  window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
});
