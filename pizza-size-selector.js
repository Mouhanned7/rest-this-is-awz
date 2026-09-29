// Pizza selection and size choice functionality

// Function to open pizza size selection modal
function openPizzaSizeModal(pizzaName) {
  // Find the pizza in our grouped data
  const pizza = pizzaProducts.find(p => p.name === pizzaName);
  
  if (!pizza) {
    console.error(`Pizza not found: ${pizzaName}`);
    return;
  }
  
  // Create modal for size selection
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'pizzaSizeModal';
  modal.tabIndex = '-1';
  modal.role = 'dialog';
  modal.setAttribute('aria-labelledby', 'pizzaSizeModalLabel');
  modal.setAttribute('aria-hidden', 'true');
  
  // Modal content
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
      <div class="modal-content" style="background: var(--card-bg); color: var(--text-primary); border: 1px solid var(--border-color);">
        <div class="modal-header" style="border-bottom: 1px solid var(--border-color);">
          <h5 class="modal-title" id="pizzaSizeModalLabel" style="color: var(--text-primary);">
            <i class="fa fa-cutlery mr-2"></i> Choisissez votre taille pour ${pizza.name}
          </h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close" style="color: var(--text-primary); opacity: 0.8;">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body" style="background: var(--card-bg);">
          <!-- Pizza information display -->
          <div class="row mb-4">
            <div class="col-md-4 text-center">
              <img src="${pizza.image}" alt="${pizza.name}" style="width: 100%; max-width: 150px; border-radius: 5px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
            </div>
            <div class="col-md-8">
              <h4 style="color: var(--text-primary);">${pizza.name}</h4>
              <p style="color: var(--text-secondary);">${pizza.baseDescription}</p>
              <p style="color: var(--text-secondary);"><strong>Ingrédients:</strong> ${pizza.ingredients.join(', ')}</p>
            </div>
          </div>
          
          <h5 class="mb-3" style="color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">Sélectionnez votre format</h5>
          
          <div class="row" id="pizza-size-options">
            ${pizza.sizes.map(size => `
              <div class="col-md-4 mb-3">
                <div class="card pizza-size-card" style="background: var(--darker-bg); border: 1px solid var(--border-color); position: relative;" 
                  onclick="selectPizzaSize(this, '${pizza.name}', '${size.size}', ${size.price})">
                  <div class="pizza-size-badge">
                    <i class="fa fa-check"></i>
                  </div>
                  <div class="card-body text-center">
                    <img src="${pizza.image}" class="pizza-size-img" alt="${size.size}">
                    <h5 class="card-title" style="color: var(--text-primary);">${size.size}</h5>
                    <p class="card-text pizza-size-description" style="color: var(--text-secondary);">${size.description}</p>
                    <h6 class="card-subtitle mb-3" style="color: var(--accent-color);">$${size.price.toFixed(2)}</h6>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer" style="border-top: 1px solid var(--border-color); background: var(--card-bg);">
          <button type="button" class="btn btn-secondary" data-dismiss="modal" 
            style="background: var(--border-color); color: var(--text-primary); border: 1px solid var(--border-color);">
            Annuler
          </button>
          <button type="button" id="confirmPizzaSize" class="btn" disabled
            style="background: var(--accent-color); color: white; opacity: 0.7;">
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to document
  document.body.appendChild(modal);
  
  // Initialize and show the modal
  $('#pizzaSizeModal').modal('show');
  
  // Add event listener to remove modal from DOM after it's hidden
  $('#pizzaSizeModal').on('hidden.bs.modal', function () {
    document.body.removeChild(modal);
  });
}

// Variables to store the selected pizza size
let selectedPizzaName = null;
let selectedPizzaSize = null;
let selectedPizzaPrice = null;

// Function to handle pizza size selection
function selectPizzaSize(cardElement, pizzaName, size, price) {
  // Remove selected class from all cards
  const allCards = document.querySelectorAll('.pizza-size-card');
  allCards.forEach(card => card.classList.remove('selected'));
  
  // Add selected class to this card
  cardElement.classList.add('selected');
  
  // Store selected pizza details
  selectedPizzaName = pizzaName;
  selectedPizzaSize = size;
  selectedPizzaPrice = price;
  
  // Enable the confirm button
  const confirmButton = document.getElementById('confirmPizzaSize');
  confirmButton.disabled = false;
  confirmButton.style.opacity = '1';
  
  // Update button text to show price
  confirmButton.textContent = `Ajouter au panier - $${price.toFixed(2)}`;
  
  // Add click event to confirm button if not already added
  if (!confirmButton.hasAttribute('data-listener-attached')) {
    confirmButton.addEventListener('click', function() {
      addPizzaToCart(selectedPizzaName, selectedPizzaSize, selectedPizzaPrice);
    });
    confirmButton.setAttribute('data-listener-attached', 'true');
  }
}

// Function to add selected pizza to cart
function addPizzaToCart(pizzaName, size, price) {
  // Find the pizza in our data
  const pizza = pizzaProducts.find(p => p.name === pizzaName);
  if (!pizza) return;
  
  // Create the full product name with size
  const fullProductName = `${pizzaName} (${size}) Base tomate`;
  
  // Add to cart using existing cart functionality
  addToCart(fullProductName, price);
  
  // Close the modal
  $('#pizzaSizeModal').modal('hide');
  
  // Reset selection variables
  selectedPizzaName = null;
  selectedPizzaSize = null;
  selectedPizzaPrice = null;
}

// Function to render pizza products in the grid
function loadPizzaProducts() {
  const grid = document.getElementById('product-grid');
  
  // Only clear the grid if this is being called separately
  // Otherwise let the main loadProducts function handle it
  if (!window.productsLoaded) {
    grid.innerHTML = '';
  }
  
  // Add each pizza product to the grid
  pizzaProducts.forEach(pizza => {
    const col = document.createElement('div');
    col.className = `col-xl-4-custom col-lg-4 col-md-6 col-sm-12 all ${pizza.category}`;
    
    // Calculate average price for display
    const avgPrice = pizza.sizes.reduce((sum, size) => sum + size.price, 0) / pizza.sizes.length;
    
    col.innerHTML = `
      <div class="product-card" onclick="showProductDetails('${pizza.name.replace(/'/g, "\\'")}', '${pizza.ingredients.join(', ').replace(/'/g, "\\'")}', ${avgPrice}, '${pizza.image}')">
        <div class="img-box">
          <img src="${pizza.image}" alt="${pizza.name}">
        </div>
        <div class="detail-box">
          <h5>${pizza.name}</h5>
          <p>${pizza.baseDescription}</p>
          <div class="options">
            <h6>À partir de $${Math.min(...pizza.sizes.map(s => s.price)).toFixed(2)}</h6>
            <button class="add-to-cart-btn" onclick="event.stopPropagation(); openPizzaSizeModal('${pizza.name.replace(/'/g, "\\'")}')">
              Choisir
            </button>
          </div>
        </div>
      </div>
    `;
    
    grid.appendChild(col);
  });
}