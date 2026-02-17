const SHARE_CARD_IMAGES = [
  '/assets/share/share-card-1.png',
  '/assets/share/share-card-2.png',
  '/assets/share/share-card-3.png',
];

function pickRandomShareCard() {
  const idx = Math.floor(Math.random() * SHARE_CARD_IMAGES.length);
  return SHARE_CARD_IMAGES[idx];
}

module.exports = {
  SHARE_CARD_IMAGES,
  pickRandomShareCard,
};
