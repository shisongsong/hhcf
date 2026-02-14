const MEAL_TYPES = {
  breakfast: {
    key: 'breakfast',
    label: '早餐',
    emoji: '🌅',
    titlePrefix: '早餐打卡',
    color: '#FFB74D',
    bgColor: 'rgba(255, 183, 77, 0.15)',
  },
  lunch: {
    key: 'lunch',
    label: '午餐',
    emoji: '☀️',
    titlePrefix: '午餐打卡',
    color: '#7CB342',
    bgColor: 'rgba(124, 179, 66, 0.15)',
  },
  dinner: {
    key: 'dinner',
    label: '晚餐',
    emoji: '🌙',
    titlePrefix: '晚餐打卡',
    color: '#5C6BC0',
    bgColor: 'rgba(92, 107, 192, 0.15)',
  },
  snack: {
    key: 'snack',
    label: '加餐',
    emoji: '🍪',
    titlePrefix: '加餐打卡',
    color: '#BA68C8',
    bgColor: 'rgba(186, 104, 200, 0.15)',
  },
};

function getMealTypeByHour(hour) {
  if (hour >= 6 && hour < 11) {
    return MEAL_TYPES.breakfast;
  } else if (hour >= 11 && hour < 15) {
    return MEAL_TYPES.lunch;
  } else if (hour >= 17 && hour < 23) {
    return MEAL_TYPES.dinner;
  } else {
    return MEAL_TYPES.snack;
  }
}

function recognizeMealType(date) {
  const hour = date.getHours();
  return getMealTypeByHour(hour);
}

function getMealTypeInfo(mealTypeKey) {
  return MEAL_TYPES[mealTypeKey] || MEAL_TYPES.snack;
}

function generateTitle(mealTypeKey) {
  const mealInfo = getMealTypeInfo(mealTypeKey);
  return mealInfo.titlePrefix;
}

function getAllMealTypes() {
  return Object.values(MEAL_TYPES);
}

module.exports = {
  MEAL_TYPES,
  getMealTypeByHour,
  recognizeMealType,
  getMealTypeInfo,
  generateTitle,
  getAllMealTypes,
};
