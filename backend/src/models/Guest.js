/**
 * OOP Domain Model: Guest
 * Indkapsler gæstedata og forretningsmetoder.
 */

export class Guest {
  constructor({ id = null, firstName, lastName, email, phone = null, country = null, createdAt = null }) {
    this.id = id;
    this.firstName = firstName?.trim();
    this.lastName = lastName?.trim();
    this.email = email?.trim().toLowerCase();
    this.phone = phone?.trim() || null;
    this.country = country?.trim() || null;
    this.createdAt = createdAt || new Date();
  }

  getFullName() {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  getDisplayCountry() {
    return this.country || 'Ukendt';
  }

  validate() {
    if (!this.firstName) throw new Error('Gæstens fornavn er påkrævet.');
    if (!this.lastName) throw new Error('Gæstens efternavn er påkrævet.');
    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      throw new Error('Gæstens emailadresse er ugyldig.');
    }
  }

  toJSON() {
    return {
      id: this.id,
      first_name: this.firstName,
      last_name: this.lastName,
      full_name: this.getFullName(),
      email: this.email,
      phone: this.phone,
      country: this.country,
      display_country: this.getDisplayCountry(),
      created_at: this.createdAt
    };
  }
}
