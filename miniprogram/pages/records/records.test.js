/**
 * Unit Tests for records.js
 * Comprehensive test coverage for the records page functionality
 */

// Mock dependencies
jest.mock('../../../app', () => ({
  globalData: {
    token: 'mock-token',
    apiBase: 'http://mock-api',
  },
  getToken: jest.fn(() => 'mock-token'),
  request: jest.fn(),
}));

jest.mock('../../../utils/util', () => ({
  formatGroupTitle: jest.fn((timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return '今天';
    }
    return date.toLocaleDateString();
  }),
}));

jest.mock('../../../utils/meal', () => ({
  getMealTypeInfo: jest.fn((key) => ({
    key,
    label: key,
    icon: '🍽️',
    color: '#FFB300',
  })),
}));

// Mock wx global object
global.wx = {
  navigateTo: jest.fn(),
  showActionSheet: jest.fn(),
  stopPullDownRefresh: jest.fn(),
};

const app = require('../../../app');
const { formatGroupTitle } = require('../../../utils/util');
const { getMealTypeInfo } = require('../../../utils/meal');

// Create mock Page class
class Page {
  constructor(pageConfig) {
    this.data = pageConfig.data || {};
    Object.keys(pageConfig).forEach(key => {
      if (key !== 'data') {
        this[key] = pageConfig[key].bind(this);
      }
    });
    this.setData = jest.fn((newData) => {
      this.data = { ...this.data, ...newData };
    });
  }
}

// Load the page module
const recordsPage = new Page(require('./records'));

describe('Records Page Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recordsPage.data = {
      records: [],
      groupedRecords: {},
      groupKeys: [],
      filterMealType: null,
      filterText: '',
      isFilterActive: false,
      isLoading: true,
    };
    app.request.mockClear();
    wx.navigateTo.mockClear();
    wx.showActionSheet.mockClear();
    wx.stopPullDownRefresh.mockClear();
    formatGroupTitle.mockClear();
    getMealTypeInfo.mockClear();
  });

  describe('loadRecords', () => {
    it('should load records successfully and group them by date', async () => {
      const mockRecords = [
        { _id: '1', timestamp: Date.now(), mealType: 'breakfast', imageUrl: 'url1' },
        { _id: '2', timestamp: Date.now(), mealType: 'lunch', imageUrl: 'url2' },
      ];
      app.request.mockResolvedValue({ data: mockRecords });
      formatGroupTitle.mockReturnValue('今天');

      await recordsPage.loadRecords();

      expect(app.request).toHaveBeenCalledWith({
        url: '/api/records',
        method: 'GET',
      });
      expect(recordsPage.setData).toHaveBeenCalledWith({ isLoading: true });
      expect(recordsPage.setData).toHaveBeenCalledWith({
        records: mockRecords,
        groupedRecords: { '今天': mockRecords },
        groupKeys: ['今天'],
        isLoading: false,
      });
    });

    it('should handle empty records array', async () => {
      app.request.mockResolvedValue({ data: [] });

      await recordsPage.loadRecords();

      expect(recordsPage.setData).toHaveBeenCalledWith({
        records: [],
        groupedRecords: {},
        groupKeys: [],
        isLoading: false,
      });
    });

    it('should handle missing data in response', async () => {
      app.request.mockResolvedValue({});

      await recordsPage.loadRecords();

      expect(recordsPage.setData).toHaveBeenCalledWith({
        records: [],
        groupedRecords: {},
        groupKeys: [],
        isLoading: false,
      });
    });

    it('should group records into multiple date groups', async () => {
      const today = Date.now();
      const yesterday = today - 24 * 60 * 60 * 1000;
      const mockRecords = [
        { _id: '1', timestamp: today, mealType: 'breakfast' },
        { _id: '2', timestamp: yesterday, mealType: 'lunch' },
      ];
      app.request.mockResolvedValue({ data: mockRecords });
      formatGroupTitle.mockImplementation((ts) => {
        return ts === today ? '今天' : '昨天';
      });

      await recordsPage.loadRecords();

      expect(recordsPage.setData).toHaveBeenCalledWith({
        records: mockRecords,
        groupedRecords: {
          '今天': [mockRecords[0]],
          '昨天': [mockRecords[1]],
        },
        groupKeys: ['今天', '昨天'],
        isLoading: false,
      });
    });

    it('should handle network errors gracefully', async () => {
      const mockError = new Error('Network error');
      app.request.mockRejectedValue(mockError);
      console.error = jest.fn();

      await recordsPage.loadRecords();

      expect(console.error).toHaveBeenCalledWith('加载记录失败', mockError);
      expect(recordsPage.setData).toHaveBeenCalledWith({ isLoading: false });
    });

    it('should set isLoading to true before loading', async () => {
      app.request.mockResolvedValue({ data: [] });

      await recordsPage.loadRecords();

      const setDataCalls = recordsPage.setData.mock.calls;
      expect(setDataCalls[0]).toEqual([{ isLoading: true }]);
    });

    it('should set isLoading to false after successful load', async () => {
      app.request.mockResolvedValue({ data: [] });

      await recordsPage.loadRecords();

      const setDataCalls = recordsPage.setData.mock.calls;
      expect(setDataCalls[setDataCalls.length - 1]).toEqual(
        expect.objectContaining({ isLoading: false })
      );
    });

    it('should handle records with same timestamp', async () => {
      const sameTimestamp = Date.now();
      const mockRecords = [
        { _id: '1', timestamp: sameTimestamp, mealType: 'breakfast' },
        { _id: '2', timestamp: sameTimestamp, mealType: 'lunch' },
        { _id: '3', timestamp: sameTimestamp, mealType: 'dinner' },
      ];
      app.request.mockResolvedValue({ data: mockRecords });
      formatGroupTitle.mockReturnValue('今天');

      await recordsPage.loadRecords();

      expect(recordsPage.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          groupedRecords: { '今天': mockRecords },
          groupKeys: ['今天'],
        })
      );
    });
  });

  describe('onMenuTap', () => {
    it('should show action sheet with meal type options', () => {
      recordsPage.onMenuTap();

      expect(wx.showActionSheet).toHaveBeenCalledWith({
        itemList: ['全部', '🌅 早餐', '🌞 午餐', '🌙 晚餐', '➕ 加餐'],
        expect.any(Function),
      });
    });

    it('should apply filter when user selects breakfast', () => {
      wx.showActionSheet.mockImplementation(({ success }) => {
        success({ tapIndex: 1 });
      });
      const applyFilterSpy = jest.spyOn(recordsPage, 'applyFilter');

      recordsPage.onMenuTap();

      expect(applyFilterSpy).toHaveBeenCalledWith('breakfast', '🌅 早餐');
    });

    it('should apply filter when user selects lunch', () => {
      wx.showActionSheet.mockImplementation(({ success }) => {
        success({ tapIndex: 2 });
      });
      const applyFilterSpy = jest.spyOn(recordsPage, 'applyFilter');

      recordsPage.onMenuTap();

      expect(applyFilterSpy).toHaveBeenCalledWith('lunch', '🌞 午餐');
    });

    it('should apply filter when user selects dinner', () => {
      wx.showActionSheet.mockImplementation(({ success }) => {
        success({ tapIndex: 3 });
      });
      const applyFilterSpy = jest.spyOn(recordsPage, 'applyFilter');

      recordsPage.onMenuTap();

      expect(applyFilterSpy).toHaveBeenCalledWith('dinner', '🌙 晚餐');
    });

    it('should apply filter when user selects snack', () => {
      wx.showActionSheet.mockImplementation(({ success }) => {
        success({ tapIndex: 4 });
      });
      const applyFilterSpy = jest.spyOn(recordsPage, 'applyFilter');

      recordsPage.onMenuTap();

      expect(applyFilterSpy).toHaveBeenCalledWith('snack', '➕ 加餐');
    });

    it('should reset filter when user selects all', () => {
      wx.showActionSheet.mockImplementation(({ success }) => {
        success({ tapIndex: 0 });
      });
      const applyFilterSpy = jest.spyOn(recordsPage, 'applyFilter');

      recordsPage.onMenuTap();

      expect(applyFilterSpy).toHaveBeenCalledWith(null, '全部');
    });

    it('should handle when user cancels action sheet', () => {
      wx.showActionSheet.mockImplementation(({ fail }) => {
        fail({ errMsg: 'showActionSheet:fail cancel' });
      });
      const applyFilterSpy = jest.spyOn(recordsPage, 'applyFilter');

      recordsPage.onMenuTap();

      expect(applyFilterSpy).not.toHaveBeenCalled();
    });
  });

  describe('applyFilter', () => {
    it('should reset all filter when key is null', () => {
      const loadRecordsSpy = jest.spyOn(recordsPage, 'loadRecords');

      recordsPage.applyFilter(null, '');

      expect(recordsPage.setData).toHaveBeenCalledWith({
        filterMealType: null,
        filterText: '',
        isFilterActive: false,
      });
      expect(loadRecordsSpy).toHaveBeenCalled();
    });

    it('should apply breakfast filter', () => {
      const loadRecordsSpy = jest.spyOn(recordsPage, 'loadRecords');

      recordsPage.applyFilter('breakfast', '🌅 早餐');

      expect(recordsPage.setData).toHaveBeenCalledWith({
        filterMealType: 'breakfast',
        filterText: '仅显示：🌅 早餐',
        isFilterActive: true,
      });
      expect(loadRecordsSpy).toHaveBeenCalled();
    });

    it('should apply lunch filter', () => {
      const loadRecordsSpy = jest.spyOn(recordsPage, 'loadRecords');

      recordsPage.applyFilter('lunch', '🌞 午餐');

      expect(recordsPage.setData).toHaveBeenCalledWith({
        filterMealType: 'lunch',
        filterText: '仅显示：🌞 午餐',
        isFilterActive: true,
      });
      expect(loadRecordsSpy).toHaveBeenCalled();
    });

    it('should apply dinner filter', () => {
      const loadRecordsSpy = jest.spyOn(recordsPage, 'loadRecords');

      recordsPage.applyFilter('dinner', '🌙 晚餐');

      expect(recordsPage.setData).toHaveBeenCalledWith({
        filterMealType: 'dinner',
        filterText: '仅显示：🌙 晚餐',
        isFilterActive: true,
      });
      expect(loadRecordsSpy).toHaveBeenCalled();
    });

    it('should apply snack filter', () => {
      const loadRecordsSpy = jest.spyOn(recordsPage, 'loadRecords');

      recordsPage.applyFilter('snack', '➕ 加餐');

      expect(recordsPage.setData).toHaveBeenCalledWith({
        filterMealType: 'snack',
        filterText: '仅显示：➕ 加餐',
        isFilterActive: true,
      });
      expect(loadRecordsSpy).toHaveBeenCalled();
    });

    it('should call loadRecords after setting filter', () => {
      const loadRecordsSpy = jest.spyOn(recordsPage, 'loadRecords');

      recordsPage.applyFilter('breakfast', '🌅 早餐');

      expect(loadRecordsSpy).toHaveBeenCalled();
    });
  });

  describe('onResetFilter', () => {
    it('should reset filter by calling applyFilter with null', () => {
      const applyFilterSpy = jest.spyOn(recordsPage, 'applyFilter');

      recordsPage.onResetFilter();

      expect(applyFilterSpy).toHaveBeenCalledWith(null, '');
    });
  });

  describe('onRecordTap', () => {
    it('should navigate to detail page with correct id', () => {
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: 'record-123',
          },
        },
      };
      console.log = jest.fn();

      recordsPage.onRecordTap(mockEvent);

      expect(console.log).toHaveBeenCalledWith(mockEvent);
      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/detail/detail?id=record-123',
      });
    });

    it('should handle event with string id', () => {
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: 'string-id-456',
          },
        },
      };

      recordsPage.onRecordTap(mockEvent);

      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/detail/detail?id=string-id-456',
      });
    });

    it('should handle event with numeric id', () => {
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: 12345,
          },
        },
      };

      recordsPage.onRecordTap(mockEvent);

      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/detail/detail?id=12345',
      });
    });

    it('should handle event with empty id', () => {
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: '',
          },
        },
      };

      recordsPage.onRecordTap(mockEvent);

      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/detail/detail?id=',
      });
    });

    it('should log event to console', () => {
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: 'test-id',
          },
        },
      };
      console.log = jest.fn();

      recordsPage.onRecordTap(mockEvent);

      expect(console.log).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle event with special characters in id', () => {
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: 'record-with-special-chars-!@#$%',
          },
        },
      };

      recordsPage.onRecordTap(mockEvent);

      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/detail/detail?id=record-with-special-chars-!@#$%',
      });
    });
  });

  describe('onShareAppMessage', () => {
    it('should return correct share message', () => {
      const result = recordsPage.onShareAppMessage();

      expect(result).toEqual({
        title: '好好吃饭',
        path: '/pages/records/records',
      });
    });

    it('should return object with title and path properties', () => {
      const result = recordsPage.onShareAppMessage();

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('path');
      expect(typeof result.title).toBe('string');
      expect(typeof result.path).toBe('string');
    });

    it('should return path starting with /', () => {
      const result = recordsPage.onShareAppMessage();

      expect(result.path).toMatch(/^\//);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full flow: menu tap -> apply filter -> load records', async () => {
      const mockRecords = [
        { _id: '1', timestamp: Date.now(), mealType: 'breakfast' },
      ];
      app.request.mockResolvedValue({ data: mockRecords });

      // User taps menu and selects breakfast
      wx.showActionSheet.mockImplementation(({ success }) => {
        success({ tapIndex: 1 });
      });

      recordsPage.onMenuTap();

      // Verify filter was applied
      expect(recordsPage.data.filterMealType).toBe('breakfast');
      expect(recordsPage.data.isFilterActive).toBe(true);
    });

    it('should complete full flow: reset filter -> load records', async () => {
      const mockRecords = [
        { _id: '1', timestamp: Date.now(), mealType: 'lunch' },
      ];
      app.request.mockResolvedValue({ data: mockRecords });

      // First apply a filter
      recordsPage.applyFilter('breakfast', '🌅 早餐');
      expect(recordsPage.data.isFilterActive).toBe(true);

      // Then reset
      recordsPage.onResetFilter();
      expect(recordsPage.data.isFilterActive).toBe(false);
      expect(recordsPage.data.filterMealType).toBe(null);
    });

    it('should handle consecutive record taps', () => {
      const mockEvent1 = {
        currentTarget: { dataset: { id: 'record-1' } },
      };
      const mockEvent2 = {
        currentTarget: { dataset: { id: 'record-2' } },
      };

      recordsPage.onRecordTap(mockEvent1);
      recordsPage.onRecordTap(mockEvent2);

      expect(wx.navigateTo).toHaveBeenCalledTimes(2);
      expect(wx.navigateTo).toHaveBeenNthCalledWith(1, {
        url: '/pages/detail/detail?id=record-1',
      });
      expect(wx.navigateTo).toHaveBeenNthCalledWith(2, {
        url: '/pages/detail/detail?id=record-2',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large number of records', async () => {
      const mockRecords = Array.from({ length: 1000 }, (_, i) => ({
        _id: `record-${i}`,
        timestamp: Date.now() - i * 1000,
        mealType: 'breakfast',
      }));
      app.request.mockResolvedValue({ data: mockRecords });
      formatGroupTitle.mockReturnValue('今天');

      await recordsPage.loadRecords();

      expect(recordsPage.data.records).toHaveLength(1000);
      expect(recordsPage.data.isLoading).toBe(false);
    });

    it('should handle records with invalid timestamps', async () => {
      const mockRecords = [
        { _id: '1', timestamp: 'invalid', mealType: 'breakfast' },
        { _id: '2', timestamp: null, mealType: 'lunch' },
        { _id: '3', timestamp: undefined, mealType: 'dinner' },
      ];
      app.request.mockResolvedValue({ data: mockRecords });
      formatGroupTitle.mockReturnValue('未知日期');

      await recordsPage.loadRecords();

      expect(recordsPage.data.records).toEqual(mockRecords);
      expect(recordsPage.data.isLoading).toBe(false);
    });

    it('should handle rapid consecutive filter changes', () => {
      const loadRecordsSpy = jest.spyOn(recordsPage, 'loadRecords');

      recordsPage.applyFilter('breakfast', '🌅 早餐');
      recordsPage.applyFilter('lunch', '🌞 午餐');
      recordsPage.applyFilter('dinner', '🌙 晚餐');
      recordsPage.applyFilter(null, '');

      expect(loadRecordsSpy).toHaveBeenCalledTimes(4);
    });

    it('should handle request timeout', async () => {
      const timeoutError = new Error('timeout');
      app.request.mockRejectedValue(timeoutError);
      console.error = jest.fn();

      await recordsPage.loadRecords();

      expect(console.error).toHaveBeenCalledWith('加载记录失败', timeoutError);
      expect(recordsPage.data.isLoading).toBe(false);
    });

    it('should handle records with missing fields', async () => {
      const mockRecords = [
        { _id: '1', timestamp: Date.now() },
        { _id: '2', mealType: 'lunch' },
        { _id: '3' },
      ];
      app.request.mockResolvedValue({ data: mockRecords });
      formatGroupTitle.mockReturnValue('今天');

      await recordsPage.loadRecords();

      expect(recordsPage.data.records).toEqual(mockRecords);
    });
  });
});
