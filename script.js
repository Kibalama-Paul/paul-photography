// Flip card is handled purely in CSS on hover
// Handle booking form submission
document.getElementById('booking-form')?.addEventListener('submit', function(e) {
  e.preventDefault();
  alert('Thank you for booking a photoshoot! I will contact you soon.');
  this.reset();
});

