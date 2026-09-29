
class Index {
  constructor() {
    this.initMenuFilter();
    this.initOrderPopup();
  }

  initMenuFilter() {
    // Example: Isotope filter for menu
    if (window.$ && $('.filters_menu').length) {
      var $grid = $('.grid').isotope({
        itemSelector: '.all',
        layoutMode: 'fitRows'
      });
      $('.filters_menu li').on('click', function () {
        $('.filters_menu li').removeClass('active');
        $(this).addClass('active');
        var filterValue = $(this).attr('data-filter');
        $grid.isotope({ filter: filterValue });
      });
    }
  }

  initOrderPopup() {
    document.body.addEventListener('click', function(e) {
      // Commandez maintenant buttons
      if (e.target.closest('.btn1') || e.target.closest('.order_online') || (e.target.closest('.options a') && e.target.closest('.options a').innerText.trim().toLowerCase().includes('order'))) {
        e.preventDefault();
        $('#orderModal').modal('show');
      }
    });
  }
}

class Book {
  constructor() {
    // Example: booking form logic
    this.initBookingForm();
    // Add other book page logic here
  }

  initBookingForm() {
    // Example: handle booking form submit
    const form = document.querySelector('.form_container form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        // Add booking logic here (e.g., validation, AJAX)
        alert('Booking submitted!');
      });
    }
  }
}
