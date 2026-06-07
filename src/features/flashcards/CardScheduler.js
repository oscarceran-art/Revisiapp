export class CardScheduler {
  constructor(cards) {
    this.cards = cards;
  }

  scheduleReviews() {
    return this.cards.map(card => ({
      ...card,
      next_review: this.calculateNextReviewDate(card)
    }));
  }

  calculateNextReviewDate(card) {
    const { interval, easeFactor } = this.calculateInterval(card);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);
    return nextDate.toISOString().split('T')[0];
  }

  calculateInterval(card) {
    // Custom tiered stack implementation
    const稳定性 = this.calculateStability(card);
    
    if (稳定性 > 0.8) {
      return { interval: card.interval * 2, easeFactor: card.ease_factor };
    } else if (稳定性 > 0.5) {
      return { interval: card.interval * 1.5, easeFactor: card.ease_factor };
    } else {
      return { interval: 1, easeFactor: 2.5 };
    }
  }

  calculateStability(card) {
    // Stability calculation based on forgetting factor
    const daysSinceLastReview = this.getDaysSinceLastReview(card);
    const stability = Math.min(1, daysSinceLastReview / card.interval);
    return stability;
  }

  getDaysSinceLastReview(card) {
    const lastReviewDate = new Date(card.last_review);
    const today = new Date();
    return Math.floor((today - lastReviewDate) / (1000 * 60 * 60 * 24));
  }
}