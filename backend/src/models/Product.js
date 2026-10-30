/**
 * OOP Domain Model: Product
 * Repræsenterer en drikkevare (cocktail, kaffe el.lign.) i lobbybaren.
 */

export class Product {
  constructor({ id, name, category, unitPriceDkk }) {
    this.id = id;
    this.name = name;
    this.category = category;
    this.unitPriceDkk = parseFloat(unitPriceDkk);
  }

  isCocktail() {
    return this.category === 'cocktail';
  }

  isCoffee() {
    return this.category === 'coffee';
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      unit_price_dkk: this.unitPriceDkk
    };
  }
}
