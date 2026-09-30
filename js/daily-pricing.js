/* Shared promotion rules: used by the cart and server-side order validation. */
(function(root, factory) {
  const pricing = factory();
  if (typeof module === 'object' && module.exports) module.exports = pricing;
  else root.DailyPricing = pricing;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  function totals(cart, mode) {
    const subtotalCents = cart.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
    const pizzas = cart.flatMap(item => item.promo ? Array(item.quantity).fill(Math.round(item.price * 100)) : []).sort((a,b) => a-b);
    const cheapest = count => pizzas.slice(0, count).reduce((sum, price) => sum + price, 0);
    let discountCents = 0;
    let label = '';
    if (mode === 'pickup' && pizzas.length >= 2) {
      discountCents = cheapest(Math.floor(pizzas.length / 2));
      label = 'À emporter : 2e pizza offerte';
    }
    if (mode === 'delivery' && pizzas.length >= 2) {
      const half = Math.round(cheapest(Math.floor(pizzas.length / 2)) / 2);
      const free = cheapest(Math.floor(pizzas.length / 3));
      discountCents = Math.max(half, free);
      label = free >= half ? 'Livraison : 3e pizza offerte' : 'Livraison : 2e pizza à −50 %';
    }
    return {subtotal:subtotalCents/100, discount:discountCents/100, total:(subtotalCents-discountCents)/100, label};
  }
  return {totals};
});
