Component({
  properties: {
    type: String,
    color: String,
  },
  data: {
    imageError: false,
  },
  attached() {
    console.log('meal-icon attached, type:', this.data.type);
  },
  methods: {
    onImageError(e) {
      console.error('Meal icon image failed to load:', this.data.type, e.detail.errMsg);
      this.setData({ imageError: true });
    },
  },
});
