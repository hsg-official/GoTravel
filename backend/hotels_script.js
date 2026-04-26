// 1. Supabase Connection Setup
const supabaseUrl = 'https://cdcolkoavowjjymzdzud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY29sa29hdm93amp5bXpkenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDI2NjQsImV4cCI6MjA4Mzk3ODY2NH0.JPzj9fI1pKpPbPxyGqsemjcwpKiu0h046H7aBSURnpM';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// We will store the fetched hotels here so filtering still works
let hotels = [];

// Function to handle the button click
function visitHotel(hotelId) {
    alert("Redirecting to hotel details for ID: " + hotelId);
    
}
// 1. Select the button and the menu
const transportBtn = document.getElementById('transportBtn');
const transportMenu = document.getElementById('transportMenu');

// 2. Add the click event
transportBtn.addEventListener('click', function(e) {
    e.preventDefault(); // Prevents the link from acting like a normal URL
    transportMenu.classList.toggle('show'); // Toggles the visibility
});

// 3. Optional: Close the menu if the user clicks anywhere else
window.addEventListener('click', function(e) {
    if (!transportBtn.contains(e.target)) {
        transportMenu.classList.remove('show');
    }
});
