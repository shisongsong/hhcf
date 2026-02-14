const { getMealTypeInfo } = require('../../utils/meal');

Component({
  properties: {
    mealType: {
      type: String,
      value: 'lunch',
    },
    size: {
      type: String,
      value: 'normal',
    },
  },

  data: {
    mealInfo: {},
  },

  observers: {
    'mealType': function (mealType) {
      const mealInfo = getMealTypeInfo(mealType);
      this.setData({ mealInfo });
    },
  },

  lifetimes: {
    attached() {
      const mealInfo = getMealTypeInfo(this.data.mealType);
      this.setData({ mealInfo });
    },
  },
});
