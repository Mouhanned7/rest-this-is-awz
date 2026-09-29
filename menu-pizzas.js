// Grouped pizza data for better organization and size selection
const pizzaProducts = [
  {
    name: "Margherita Pizza",
    baseDescription: "Symbole de la tradition italienne : une base tomate parfumée et une mozzarella fondante pour une pureté de goût.",
    category: "pizza",
    image: "images/1.jpg",
    ingredients: ["Base Tomate", "Mozzarella"],
    sizes: [
      { size: "Junior", price: 8, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 12.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 15.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Bambino Pizza",
    baseDescription: "Recette douce et équilibrée pensée pour les plus jeunes gourmands.",
    category: "pizza",
    image: "images/2.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Jambon", "Œuf"],
    sizes: [
      { size: "Junior", price: 8.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 14.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 18.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Calzone Pizza",
    baseDescription: "Version fermée gourmande au cœur fondant et généreux.",
    category: "pizza",
    image: "images/3.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Viande Hachée ou Jambon", "Œuf"],
    sizes: [
      { size: "Junior", price: 8.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 14.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 18.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Napolitaine Pizza",
    baseDescription: "Spécialité méditerranéenne aux notes marines authentiques et intenses.",
    category: "pizza",
    image: "images/5.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Anchois", "Câpres", "Olives"],
    sizes: [
      { size: "Junior", price: 8.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 14.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 18.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Regina Pizza",
    baseDescription: "Classique savoureuse mêlant jambon délicat et champignons fondants.",
    category: "pizza",
    image: "images/pizza napolitaine.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Jambon", "Champignons"],
    sizes: [
      { size: "Junior", price: 8.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 14.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 18.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "4 Fromages Pizza",
    baseDescription: "Alliance onctueuse et parfumée des meilleurs fromages.",
    category: "pizza",
    image: "images/6.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Gorgonzola", "Chèvre", "Brie"],
    sizes: [
      { size: "Junior", price: 8.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 14.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 18.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Campion Pizza",
    baseDescription: "Recette robuste et gourmande pour les appétits solides.",
    category: "pizza",
    image: "images/campion pizza.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Viande Hachée", "Champignons"],
    sizes: [
      { size: "Junior", price: 8.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 14.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 18.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "4 Saisons Pizza",
    baseDescription: "Un tour des saveurs : chaque part révèle une nuance différente.",
    category: "pizza",
    image: "images/8.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Jambon", "Champignons", "Poivrons", "Olives"],
    sizes: [
      { size: "Junior", price: 9, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Fruits de Mer Pizza",
    baseDescription: "Richesse marine : fruits de mer frais et ail parfumé sur une base tomate.",
    category: "pizza",
    image: "images/666.png",
    ingredients: ["Base Tomate", "Mozzarella", "Fruits de Mer", "Ail"],
    sizes: [
      { size: "Junior", price: 9, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Vegetarienne Pizza",
    baseDescription: "Saveurs fraîches du jardin : mélange coloré de légumes méditerranéens sur une base tomate légère.",
    category: "pizza",
    image: "images/9.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Aubergines", "Champignons", "Poivrons", "Oignons", "Olives", "Tomate"],
    sizes: [
      { size: "Junior", price: 9, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Orientale Pizza",
    baseDescription: "Saveurs épicées d'Orient : merguez parfumée, poivrons colorés et œuf pour une touche gourmande.",
    category: "pizza",
    image: "images/10.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Merguez", "Poivrons", "Oignons", "Œuf"],
    sizes: [
      { size: "Junior", price: 9, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Speranza Pizza",
    baseDescription: "Création signature riche en viandes et en caractère.",
    category: "pizza",
    image: "images/speranza pizza.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Viande Hachée", "Merguez", "Poulet", "Buffalo"],
    sizes: [
      { size: "Junior", price: 9, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Mexicaine Pizza",
    baseDescription: "Alliance relevée et généreuse aux inspirations latines.",
    category: "pizza",
    image: "images/mexicaine pizza.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Viande Hachée", "Merguez", "Oignons", "Tomates"],
    sizes: [
      { size: "Junior", price: 9, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Texas Pizza",
    baseDescription: "Saveurs fumées et généreuses à l'esprit western.",
    category: "pizza",
    image: "images/texas pizza.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Viande Hachée", "Chorizo", "Oignons"],
    sizes: [
      { size: "Junior", price: 9, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Neptune Pizza",
    baseDescription: "Fraîcheur marine équilibrée et savoureuse.",
    category: "pizza",
    image: "images/pizza neptune.webp",
    ingredients: ["Base Tomate", "Mozzarella", "Thon", "Poivrons", "Olives", "Œuf"],
    sizes: [
      { size: "Junior", price: 9, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Kebazza Pizza",
    baseDescription: "Fusion gourmande entre traditions italienne et kebab.",
    category: "pizza",
    image: "images/kebazza pizza.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Viande de Kebab", "Oignons", "Sauce Blanche"],
    sizes: [
      { size: "Junior", price: 9, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Chicken Pizza",
    baseDescription: "Poulet tendre et garniture généreuse aux accents rustiques.",
    category: "pizza",
    image: "images/chiken pizza.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Poulet", "Pommes de Terre", "Champignons", "Poivrons", "Oignons"],
    sizes: [
      { size: "Junior", price: 9, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Caramello Pizza",
    baseDescription: "Alliance raffinée de saumon fumé et mozzarella di buffala.",
    category: "pizza",
    image: "images/caramello pizza.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Saumon Fumé", "Buffala", "Aubergines", "Champignons", "Poivrons", "Tomates"],
    sizes: [
      { size: "Junior", price: 9, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "3 Jambons Pizza",
    baseDescription: "Trio charcutier gourmand aux saveurs contrastées.",
    category: "pizza",
    image: "images/3 jmbon pizza.jpg",
    ingredients: ["Base Tomate", "Mozzarella", "Jambon", "Lardons", "Chorizo"],
    sizes: [
      { size: "Junior", price: 9, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Tartiflette Pizza",
    baseDescription: "Gourmande inspiration savoyarde : reblochon fondant, lardons et pommes de terre dorées.",
    category: "pizza",
    image: "images/12.jpg",
    ingredients: ["Base Crème", "Mozzarella", "Lardons", "Reblochon", "Pommes de terre", "Oignons"],
    sizes: [
      { size: "Junior", price: 9.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Chèvre Miel Pizza",
    baseDescription: "Alliance subtile du chèvre crémeux et de la douceur du miel.",
    category: "pizza",
    image: "images/13.jpg",
    ingredients: ["Base Crème", "Mozzarella", "Chèvre", "Miel"],
    sizes: [
      { size: "Junior", price: 9.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Raclette Pizza",
    baseDescription: "Fromage raclette fondant, poulet tendre et pommes de terre rustiques.",
    category: "pizza",
    image: "images/14.jpg",
    ingredients: ["Base Crème", "Mozzarella", "Poulet", "Raclette", "Pommes de terre", "Oignons"],
    sizes: [
      { size: "Junior", price: 9.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Campagnarde Pizza",
    baseDescription: "Saveurs rurales : poulet tendre, gorgonzola parfumé et pommes de terre.",
    category: "pizza",
    image: "images/15.jpg",
    ingredients: ["Base Crème", "Mozzarella", "Poulet", "Gorgonzola", "Pommes de terre", "Oignons"],
    sizes: [
      { size: "Junior", price: 9.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "CHTI Pizza",
    baseDescription: "Spécialité du Nord : jambon délicat et maroilles au caractère unique.",
    category: "pizza",
    image: "images/chti pizza.jpg",
    ingredients: ["Base Crème", "Mozzarella", "Jambon", "Maroilles"],
    sizes: [
      { size: "Junior", price: 9.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "FERMIÈRE Pizza",
    baseDescription: "Généreuse : viande hachée, chèvre crémeux et touches méditerranéennes.",
    category: "pizza",
    image: "images/pizza_fermiere.png",
    ingredients: ["Base Crème", "Mozzarella", "Viande Hachée", "Chèvre", "Oignons", "Olives"],
    sizes: [
      { size: "Junior", price: 9.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "NORVÉGIENNE Pizza",
    baseDescription: "Raffinement nordique : saumon fumé, buffala et champignons.",
    category: "pizza",
    image: "images/NORVÉGIENNE Pizza.jpg",
    ingredients: ["Base Crème", "Mozzarella", "Saumon Fumé", "Buffala", "Champignons"],
    sizes: [
      { size: "Junior", price: 9.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "MILANO Pizza",
    baseDescription: "Élégance italienne : jambon, buffala et pommes de terre fondantes.",
    category: "pizza",
    image: "images/milano pizza.jpg",
    ingredients: ["Base Crème", "Mozzarella", "Jambon", "Buffala", "Pommes de terre", "Oignons"],
    sizes: [
      { size: "Junior", price: 9.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  // {
  //   name: "HAWAÏENNE Pizza",
  //   baseDescription: "Douceur exotique : ananas doré et jambon tendre.",
  //   category: "pizza",
  //   image: "images/hawai pizza.jpg",
  //   ingredients: ["Base Crème", "Mozzarella", "Jambon", "Ananas"],
  //   sizes: [
  //     { size: "Junior", price: 9.5, description: "Format individuel, idéal pour une personne." },
  //     { size: "Senior", price: 15.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
  //     { size: "Méga", price: 19.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
  //   ]
  // },
  {
    name: "PIZZA CHEDDAR",
    baseDescription: "Généreuse et fondante : viande hachée savoureuse et cheddar coulant sur une base crémeuse.",
    category: "pizza",
    image: "images/777.jpg",
    ingredients: ["Base Crème", "Mozzarella", "Viande Hachée", "Cheddar"],
    sizes: [
      { size: "Junior", price: 9.5, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 15.5, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 19.5, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Roulette Al Tartufo Pizza",
    baseDescription: "Crème de truffe parfumée, poulet rôti moelleux et buffala fondante.",
    category: "pizza",
    image: "images/16.jpg",
    ingredients: ["Base Spéciale", "Mozzarella", "Crème Truffe", "Poulet", "Buffala", "Pommes de terre", "Champignons", "Oignons"],
    sizes: [
      { size: "Junior", price: 10, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 16, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 20, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "Barbecue Pizza",
    baseDescription: "Notes fumées et légèrement relevées avec un trio carné et sauce barbecue nappée.",
    category: "pizza",
    image: "images/18.jpg",
    ingredients: ["Base Spéciale", "Mozzarella", "Merguez", "Poulet", "Buffalo", "Sauce Barbecue"],
    sizes: [
      { size: "Junior", price: 10, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 16, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 20, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "AL TARTUFFO VIANDE Pizza",
    baseDescription: "Crème de truffe élégante, viande hachée fondante et buffala pour une base parfumée.",
    category: "pizza",
    image: "images/AL TARTUFFO VIANDE Pizza.jpg",
    ingredients: ["Base Spéciale", "Mozzarella", "Crème Truffe", "Viande Hachée", "Buffala", "Champignons", "Oignons"],
    sizes: [
      { size: "Junior", price: 10, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 16, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 20, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  },
  {
    name: "TACOZZA Pizza",
    baseDescription: "Fusion audacieuse : cordon bleu croustillant, tenders moelleux, sauce fromagère onctueuse et frites.",
    category: "pizza",
    image: "images/888.jpg",
    ingredients: ["Base Spéciale", "Mozzarella", "Cordon Bleu", "Tenders", "Sauce Fromagère", "Frites"],
    sizes: [
      { size: "Junior", price: 10, description: "Format individuel, idéal pour une personne." },
      { size: "Senior", price: 16, description: "Format moyen, parfait pour une personne affamée ou à partager." },
      { size: "Méga", price: 20, description: "Grand format pour 2-3 personnes, idéal à partager." }
    ]
  }
];
