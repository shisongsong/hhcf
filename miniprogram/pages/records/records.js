const app = getApp();
const { formatGroupTitle } = require('../../utils/util');
const { getMealTypeInfo } = require('../../utils/meal');

Page({
  data: {
    records: [],
    groupedRecords: {},
    groupKeys: [],
    filterMealType: null,
    filterText: '',
    isFilterActive: false,
    isLoading: true,
    currentItemId: null,
    itemPositions: [],
  },

  onLoad: function () {
    this.loadRecords();
  },

  onShow: function () {
    this.loadRecords();
  },

  onPullDownRefresh: function () {
    this.loadRecords().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadRecords: async function () {
    this.setData({ isLoading: true });

    try {
      const res = await app.request({
        url: '/api/records',
        method: 'GET',
      });

      const records = res.data || [];
      const grouped = {};
      const keys = [];

      const mealOrder = { breakfast: 1, lunch: 2, dinner: 3, snack: 4 };

      records.forEach((record) => {
        record.mealInfo = getMealTypeInfo(record.mealType);
        const groupKey = formatGroupTitle(record.timestamp);
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
          keys.push(groupKey);
        }
        grouped[groupKey].push(record);
      });

      // 按餐别顺序排序（早 -> 午 -> 晚 -> 加）
      Object.keys(grouped).forEach((key) => {
        grouped[key].sort((a, b) => {
          const orderA = mealOrder[a.mealType] || 5;
          const orderB = mealOrder[b.mealType] || 5;
          return orderA - orderB;
        });
      });

      this.setData({
        records,
        groupedRecords: grouped,
        groupKeys: keys,
        isLoading: false,
        currentItemId: records.length > 0 ? records[0].id : null,
      });
      
      setTimeout(() => {
        this.calculateItemPositions();
      }, 100);
    } catch (err) {
      console.error('加载记录失败', err);
      this.setData({ isLoading: false });
    }
  },

  onMenuTap: function () {
    const items = [
      { name: '全部', key: null },
      { name: '早餐', key: 'breakfast' },
      { name: '午餐', key: 'lunch' },
      { name: '晚餐', key: 'dinner' },
      { name: '加餐', key: 'snack' },
    ];

    wx.showActionSheet({
      itemList: items.map((item) => item.name),
      success: (res) => {
        const selected = items[res.tapIndex];
        this.applyFilter(selected.key, selected.name);
      },
    });
  },

  applyFilter: function (key, name) {
    if (key === null) {
      this.setData({
        filterMealType: null,
        filterText: '',
        isFilterActive: false,
      });
    } else {
      this.setData({
        filterMealType: key,
        filterText: `仅显示：${name}`,
        isFilterActive: true,
      });
    }
    this.loadRecords();
  },

  onResetFilter: function () {
    this.applyFilter(null, '');
  },

  calculateItemPositions: function () {
    const query = wx.createSelectorQuery();
    query.selectAll('.timeline-item').boundingClientRect((rects) => {
      if (rects) {
        const positions = rects.map((rect) => ({
          id: rect.dataset?.id,
          top: rect.top,
        }));
        this.setData({ itemPositions: positions });
      }
    }).exec();
  },

  onRecordTap: function (e) {
    console.log(e);
    const { id } = e.currentTarget.dataset;
    this.setData({ currentItemId: id });
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`,
    });
  },

  onScroll: function (e) {
    const scrollTop = e.detail.scrollTop;
    const positions = this.data.itemPositions;
    
    if (positions.length === 0) return;
    
    let currentId = null;
    for (let i = positions.length - 1; i >= 0; i--) {
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
