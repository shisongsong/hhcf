const app = getApp();
const { formatGroupTitle } = require('../../utils/util');
const { getMealTypeInfo, getAllMealTypes } = require('../../utils/meal');
const { getActiveTheme, applyTabBarTheme, applyNavigationTheme } = require('../../utils/theme');
const { pickRandomShareCard } = require('../../utils/share-card');

const REVERSED_MEAL_ORDER = { snack: 1, dinner: 2, lunch: 3, breakfast: 4 };
const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const PAGE_SIZE = 36;

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

function getWeekRangeWithOffset(weekOffset) {
  const today = cloneDayStart(new Date());
  const weekdayOffset = (today.getDay() + 6) % 7;
  const currentWeekStart = addDays(today, -weekdayOffset);
  const weekStart = addDays(currentWeekStart, weekOffset * 7);
  const weekEnd = addDays(weekStart, 7);
  return {
    startMs: weekStart.getTime(),
    endMs: weekEnd.getTime(),
  };
}

function getMonthRangeWithOffset(monthOffset) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
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
    theme: getActiveTheme(),
    nextCursor: '',
    hasMoreRecords: true,
    isLoadingMore: false,
  },

  onLoad: function () {
    this.loadedRecords = [];
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
    this.loadRecords(true);
  },

  onShow: function () {
    this.updateTheme();
    if (!this.loadedRecords || this.loadedRecords.length === 0) {
      this.loadRecords(true);
    }
  },

  onPullDownRefresh: function () {
    this.loadRecords(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  updateTheme: function () {
    const theme = getActiveTheme();
    this.setData({ theme });
    applyTabBarTheme(theme);
    applyNavigationTheme(theme);
  },

  loadRecords: async function (reset = true, options = {}) {
    if (this.isFetchingPage) return false;
    this.isFetchingPage = true;
    const silent = !!options.silent;

    if (reset) {
      this.setData({
        isLoading: !silent,
        isLoadingMore: false,
      });
      this.loadedRecords = [];
    } else if (!silent) {
      this.setData({ isLoadingMore: true });
    }

    try {
      const page = await this.fetchRecordPage(reset ? '' : this.data.nextCursor);
      const incoming = page.records.map((record) => ({
        ...record,
        mealInfo: getMealTypeInfo(record.mealType),
        formattedTime: formatHm(record.timestamp),
      }));

      this.loadedRecords = this.mergeRecords(this.loadedRecords || [], incoming);
      this.setData({
        nextCursor: page.nextCursor || '',
        hasMoreRecords: !!page.hasMore,
      });

      this.rebuildAllViews();
      if (reset && !silent && this.data.hasMoreRecords) {
        setTimeout(() => {
          this.loadRecords(false, { silent: true });
        }, 120);
      }
      return incoming.length > 0;
    } catch (err) {
      console.error('加载记录失败', err);
      return false;
    } finally {
      this.isFetchingPage = false;
      this.setData({
        isLoading: false,
        isLoadingMore: false,
      });
    }
  },

  fetchRecordPage: async function (cursor) {
    const res = await app.request({
      url: '/api/records',
      method: 'GET',
      data: {
        limit: PAGE_SIZE,
        cursor: cursor || '',
      },
    });

    if (Array.isArray(res.data)) {
      return {
        records: res.data,
        hasMore: false,
        nextCursor: '',
      };
    }
    return {
      records: (res.data && res.data.records) || [],
      hasMore: !!(res.data && res.data.hasMore),
      nextCursor: (res.data && res.data.nextCursor) || '',
    };
  },

  mergeRecords: function (baseRecords, newRecords) {
    const mergedMap = new Map();
    (baseRecords || []).forEach((item) => mergedMap.set(item.id, item));
    (newRecords || []).forEach((item) => mergedMap.set(item.id, item));
    return Array.from(mergedMap.values()).sort((a, b) => {
      if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
      return b.id > a.id ? 1 : -1;
    });
  },

  rebuildAllViews: function () {
    const records = this.loadedRecords || [];
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
      currentItemId: records.length > 0 ? records[0].id : null,
    });

    if (this.data.viewMode === 'day') {
      setTimeout(() => this.calculateItemPositions(), 80);
    }
  },

  getOldestLoadedTimestamp: function () {
    const records = this.loadedRecords || [];
    if (records.length === 0) return null;
    return records[records.length - 1].timestamp;
  },

  ensureRangeLoaded: async function (startMs) {
    let oldest = this.getOldestLoadedTimestamp();
    let guard = 0;
    while ((oldest === null || oldest > startMs) && this.data.hasMoreRecords && guard < 10) {
      const loaded = await this.loadRecords(false, { silent: true });
      if (!loaded) break;
      oldest = this.getOldestLoadedTimestamp();
      guard += 1;
    }
  },

  ensureWeekData: async function (weekOffset) {
    const range = getWeekRangeWithOffset(weekOffset);
    await this.ensureRangeLoaded(range.startMs);
  },

  ensureMonthData: async function (monthOffset) {
    const range = getMonthRangeWithOffset(monthOffset);
    await this.ensureRangeLoaded(range.startMs);
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

  onModeChange: async function (e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({ viewMode: mode });
    if (mode === 'day') {
      setTimeout(() => this.calculateItemPositions(), 60);
      return;
    }
    if (mode === 'week') {
      await this.ensureWeekData(this.data.weekOffset);
      return;
    }
    if (mode === 'month') {
      await this.ensureMonthData(this.data.monthOffset);
    }
  },

  onPrevPeriod: async function () {
    if (this.data.viewMode === 'week') {
      const targetOffset = this.data.weekOffset - 1;
      await this.ensureWeekData(targetOffset);
      this.setData({ weekOffset: targetOffset });
      this.refreshCalendarViews();
      return;
    }
    if (this.data.viewMode === 'month') {
      const targetOffset = this.data.monthOffset - 1;
      await this.ensureMonthData(targetOffset);
      this.setData({ monthOffset: targetOffset });
      this.refreshCalendarViews();
    }
  },

  onNextPeriod: async function () {
    if (this.data.viewMode === 'week') {
      const next = Math.min(this.data.weekOffset + 1, 0);
      if (next === this.data.weekOffset) return;
      await this.ensureWeekData(next);
      this.setData({ weekOffset: next });
      this.refreshCalendarViews();
      return;
    }
    if (this.data.viewMode === 'month') {
      const next = Math.min(this.data.monthOffset + 1, 0);
      if (next === this.data.monthOffset) return;
      await this.ensureMonthData(next);
      this.setData({ monthOffset: next });
      this.refreshCalendarViews();
    }
  },

  onBackCurrentPeriod: async function () {
    if (this.data.viewMode === 'week') {
      await this.ensureWeekData(0);
    } else if (this.data.viewMode === 'month') {
      await this.ensureMonthData(0);
    }
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

  onScrollToLower: function () {
    if (this.data.viewMode !== 'day') return;
    if (this.data.isLoadingMore || this.data.isLoading) return;
    if (!this.data.hasMoreRecords) return;
    this.loadRecords(false);
  },

  onShareAppMessage: function () {
    return {
      title: '好好吃饭',
      path: '/pages/records/records',
      imageUrl: pickRandomShareCard(),
    };
  },
});
