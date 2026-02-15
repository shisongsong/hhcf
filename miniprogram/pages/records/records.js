const app = getApp();
const { formatGroupTitle } = require('../../utils/util');
const { getMealTypeInfo, getAllMealTypes } = require('../../utils/meal');

const REVERSED_MEAL_ORDER = { snack: 1, dinner: 2, lunch: 3, breakfast: 4 };
const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const TIME_THEMES = {
  dawn: {
    hour: [5, 6, 7],
    bgGradient: ['#F5E6E8', '#FCEAEC', '#FFE4D6'],
    textPrimary: '#4A3040',
    textSecondary: '#7A6570',
    accent: '#C45C69',
  },
  morning: {
    hour: [8, 9, 10, 11],
    bgGradient: ['#FFF5E6', '#FFE8CC', '#FFDAB3'],
    textPrimary: '#4A3828',
    textSecondary: '#7A6558',
    accent: '#D4924A',
  },
  noon: {
    hour: [12, 13, 14],
    bgGradient: ['#FFFEF5', '#FFF8DC', '#FFF3CD'],
    textPrimary: '#4A4230',
    textSecondary: '#7A7058',
    accent: '#D4A84A',
  },
  afternoon: {
    hour: [15, 16, 17],
    bgGradient: ['#E8F4F8', '#DCE8F0', '#D0DCE8'],
    textPrimary: '#303A40',
    textSecondary: '#586870',
    accent: '#5B8BA0',
  },
  sunset: {
    hour: [18, 19, 20],
    bgGradient: ['#FFE8E8', '#FFD8D0', '#FFC8B8'],
    textPrimary: '#4A3030',
    textSecondary: '#7A5858',
    accent: '#D4605A',
  },
  night: {
    hour: [21, 22, 23, 0, 1, 2, 3, 4],
    bgGradient: ['#1A1A2E', '#16213E', '#0F3460'],
    textPrimary: '#E8E8F0',
    textSecondary: '#B8B8C8',
    accent: '#7B68EE',
  },
};

function getTimeTheme() {
  const hour = new Date().getHours();
  for (const key in TIME_THEMES) {
    if (TIME_THEMES[key].hour.includes(hour)) {
      return TIME_THEMES[key];
    }
  }
  return TIME_THEMES.morning;
}

function getDayKey(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function cloneDayStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, delta) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

function formatHm(timestamp) {
  const date = new Date(timestamp);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

Page({
  data: {
    records: [],
    groupedRecords: {},
    groupKeys: [],
    isLoading: true,
    currentItemId: null,
    itemPositions: [],
    viewMode: 'day',
    mealTypes: [],
    weekLabel: '',
    weekViewDays: [],
    monthLabel: '',
    monthViewDays: [],
    weekdaysShort: ['一', '二', '三', '四', '五', '六', '日'],
    weekOffset: 0,
    monthOffset: 0,
    showWeekReset: false,
    showMonthReset: false,
    monthSizeClass: 'normal',
    theme: getTimeTheme(),
  },

  onLoad: function () {
    const system = wx.getSystemInfoSync();
    let monthSizeClass = 'normal';
    if (system.windowWidth <= 360) {
      monthSizeClass = 'compact';
    } else if (system.windowWidth >= 420) {
      monthSizeClass = 'wide';
    }

    this.setData({
      mealTypes: getAllMealTypes(),
      monthSizeClass,
    });
    this.updateTheme();
    this.loadRecords();
  },

  onShow: function () {
    this.updateTheme();
    this.loadRecords();
  },

  onPullDownRefresh: function () {
    this.loadRecords().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  updateTheme: function () {
    this.setData({ theme: getTimeTheme() });
  },

  loadRecords: async function () {
    this.setData({ isLoading: true });

    try {
      const res = await app.request({
        url: '/api/records',
        method: 'GET',
      });

      const rawRecords = res.data || [];
      const records = rawRecords.map((record) => ({
        ...record,
        mealInfo: getMealTypeInfo(record.mealType),
        formattedTime: formatHm(record.timestamp),
      }));

      const grouped = {};
      const keys = [];
      records.forEach((record) => {
        const groupKey = formatGroupTitle(record.timestamp);
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
          keys.push(groupKey);
        }
        grouped[groupKey].push(record);
      });

      Object.keys(grouped).forEach((key) => {
        grouped[key].sort((a, b) => {
          const orderA = REVERSED_MEAL_ORDER[a.mealType] || 99;
          const orderB = REVERSED_MEAL_ORDER[b.mealType] || 99;
          return orderA - orderB;
        });
      });

      const map = this.buildDailyStatusMap(records);
      this.dailyStatusMap = map;
      const weekViewData = this.buildWeekViewDataWithOffset(map, this.data.weekOffset);
      const monthViewData = this.buildMonthViewDataWithOffset(map, this.data.monthOffset);

      this.setData({
        records,
        groupedRecords: grouped,
        groupKeys: keys,
        weekLabel: weekViewData.label,
        weekViewDays: weekViewData.days,
        monthLabel: monthViewData.label,
        monthViewDays: monthViewData.days,
        showWeekReset: this.data.weekOffset !== 0,
        showMonthReset: this.data.monthOffset !== 0,
        isLoading: false,
        currentItemId: records.length > 0 ? records[0].id : null,
      });

      if (this.data.viewMode === 'day') {
        setTimeout(() => this.calculateItemPositions(), 80);
      }
    } catch (err) {
      console.error('加载记录失败', err);
      this.setData({ isLoading: false });
    }
  },

  buildDailyStatusMap: function (records) {
    const mealTypes = this.data.mealTypes;
    const map = {};

    records.forEach((record) => {
      const dayKey = getDayKey(record.timestamp);
      if (!map[dayKey]) {
        const meals = {};
        mealTypes.forEach((meal) => {
          meals[meal.key] = { ...meal, checked: false, recordId: '' };
        });
        map[dayKey] = { meals };
      }

      const mealState = map[dayKey].meals[record.mealType];
      if (mealState && !mealState.checked) {
        mealState.checked = true;
        mealState.recordId = record.id;
      }
    });

    return map;
  },

  normalizeMeals: function (dayData) {
    return this.data.mealTypes.map((meal) => {
      if (!dayData || !dayData.meals[meal.key]) {
        return { ...meal, checked: false, recordId: '' };
      }
      return dayData.meals[meal.key];
    });
  },

  buildWeekViewDataWithOffset: function (map, weekOffset) {
    const today = cloneDayStart(new Date());
    const weekdayOffset = (today.getDay() + 6) % 7;
    const currentWeekStart = addDays(today, -weekdayOffset);
    const weekStart = addDays(currentWeekStart, weekOffset * 7);
    const weekEnd = addDays(weekStart, 6);
    const label = `${String(weekStart.getMonth() + 1).padStart(2, '0')}.${String(weekStart.getDate()).padStart(2, '0')} - ${String(weekEnd.getMonth() + 1).padStart(2, '0')}.${String(weekEnd.getDate()).padStart(2, '0')}`;
    const days = [];

    for (let i = 0; i < 7; i += 1) {
      const date = addDays(weekStart, i);
      const key = getDayKey(date.getTime());
      days.push({
        key,
        dateNum: date.getDate(),
        weekLabel: WEEKDAY_LABELS[i],
        isToday: key === getDayKey(today.getTime()),
        meals: this.normalizeMeals(map[key]),
      });
    }
    return { label, days };
  },

  buildMonthViewDataWithOffset: function (map, monthOffset) {
    const today = new Date();
    const cursor = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const leadingBlank = (firstDay.getDay() + 6) % 7;
    const days = [];

    for (let i = 0; i < leadingBlank; i += 1) {
      days.push({ key: `blank-${i}`, isPlaceholder: true });
    }

    const todayKey = getDayKey(today.getTime());
    for (let d = 1; d <= lastDay.getDate(); d += 1) {
      const date = new Date(year, month, d);
      const key = getDayKey(date.getTime());
      days.push({
        key,
        isPlaceholder: false,
        dateNum: d,
        isToday: key === todayKey,
        meals: this.normalizeMeals(map[key]),
      });
    }

    return { label: `${year}年${month + 1}月`, days };
  },

  refreshCalendarViews: function () {
    const map = this.dailyStatusMap || {};
    const week = this.buildWeekViewDataWithOffset(map, this.data.weekOffset);
    const month = this.buildMonthViewDataWithOffset(map, this.data.monthOffset);
    this.setData({
      weekLabel: week.label,
      weekViewDays: week.days,
      monthLabel: month.label,
      monthViewDays: month.days,
      showWeekReset: this.data.weekOffset !== 0,
      showMonthReset: this.data.monthOffset !== 0,
    });
  },

  onModeChange: function (e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({ viewMode: mode });
    if (mode === 'day') {
      setTimeout(() => this.calculateItemPositions(), 60);
    }
  },

  onPrevPeriod: function () {
    if (this.data.viewMode === 'week') {
      this.setData({ weekOffset: this.data.weekOffset - 1 });
      this.refreshCalendarViews();
      return;
    }
    if (this.data.viewMode === 'month') {
      this.setData({ monthOffset: this.data.monthOffset - 1 });
      this.refreshCalendarViews();
    }
  },

  onNextPeriod: function () {
    if (this.data.viewMode === 'week') {
      const next = Math.min(this.data.weekOffset + 1, 0);
      if (next === this.data.weekOffset) return;
      this.setData({ weekOffset: next });
      this.refreshCalendarViews();
      return;
    }
    if (this.data.viewMode === 'month') {
      const next = Math.min(this.data.monthOffset + 1, 0);
      if (next === this.data.monthOffset) return;
      this.setData({ monthOffset: next });
      this.refreshCalendarViews();
    }
  },

  onBackCurrentPeriod: function () {
    this.setData({ weekOffset: 0, monthOffset: 0 });
    this.refreshCalendarViews();
  },

  onDayMealTap: function (e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  calculateItemPositions: function () {
    const query = wx.createSelectorQuery();
    query.selectAll('.timeline-item').boundingClientRect((rects) => {
      if (!rects) return;
      const positions = rects.map((rect) => ({
        id: rect.dataset && rect.dataset.id,
        top: rect.top,
      }));
      this.setData({ itemPositions: positions });
    }).exec();
  },

  onRecordTap: function (e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ currentItemId: id });
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  onScroll: function (e) {
    if (this.data.viewMode !== 'day') return;
    const scrollTop = e.detail.scrollTop;
    const positions = this.data.itemPositions;
    if (positions.length === 0) return;

    let currentId = null;
    for (let i = positions.length - 1; i >= 0; i -= 1) {
      if (scrollTop >= positions[i].top - 100) {
        currentId = positions[i].id;
        break;
      }
    }
    if (currentId !== this.data.currentItemId) {
      this.setData({ currentItemId: currentId });
    }
  },

  onShareAppMessage: function () {
    return {
      title: '好好吃饭',
      path: '/pages/records/records',
    };
  },
});
