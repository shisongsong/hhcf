/**
 * Unit tests for records page - onRecordTap function
 */

describe('records.js - onRecordTap', () => {
  let pageInstance;
  let mockWx;
  let originalWx;

  beforeEach(() => {
    // Store original wx if it exists
    originalWx = global.wx;

    // Mock wx global object
    mockWx = {
      navigateTo: jest.fn(),
    };
    global.wx = mockWx;

    // Mock console.log
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Create a minimal page instance
    pageInstance = {
      onRecordTap: function(e) {
        console.log(e);
        const { id } = e.currentTarget.dataset;
        wx.navigateTo({
          url: `/pages/detail/detail?id=${id}`,
        });
      }
    };
  });

  afterEach(() => {
    // Restore original wx
    if (originalWx) {
      global.wx = originalWx;
    } else {
      delete global.wx;
    }

    // Restore console.log
    console.log.mockRestore();
  });

  describe('Normal case - valid record ID', () => {
    test('should navigate to detail page with correct ID (string)', () => {
      // Arrange
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: 'record-123'
          }
        }
      };

      // Act
      pageInstance.onRecordTap(mockEvent);

      // Assert
      expect(console.log).toHaveBeenCalledWith(mockEvent);
      expect(mockWx.navigateTo).toHaveBeenCalledTimes(1);
      expect(mockWx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/detail/detail?id=record-123'
      });
    });

    test('should navigate to detail page with numeric ID', () => {
      // Arrange
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: 456
          }
        }
      };

      // Act
      pageInstance.onRecordTap(mockEvent);

      // Assert
      expect(mockWx.navigateTo).toHaveBeenCalledTimes(1);
      expect(mockWx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/detail/detail?id=456'
      });
    });

    test('should navigate to detail page with UUID format ID', () => {
      // Arrange
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: '550e8400-e29b-41d4-a716-446655440000'
          }
        }
      };

      // Act
      pageInstance.onRecordTap(mockEvent);

      // Assert
      expect(mockWx.navigateTo).toHaveBeenCalledTimes(1);
      expect(mockWx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/detail/detail?id=550e8400-e29b-41d4-a716-446655440000'
      });
    });

    test('should log the event object', () => {
      // Arrange
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: 'test-id'
          }
        },
        type: 'tap',
        timestamp: 1234567890
      };

      // Act
      pageInstance.onRecordTap(mockEvent);

      // Assert
      expect(console.log).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe('Boundary cases', () => {
    test('should handle empty string ID', () => {
      // Arrange
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: ''
          }
        }
      };

      // Act
      pageInstance.onRecordTap(mockEvent);

      // Assert
      expect(mockWx.navigateTo).toHaveBeenCalledTimes(1);
      expect(mockWx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/detail/detail?id='
      });
    });

    test('should handle zero as ID', () => {
      // Arrange
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: 0
          }
        }
      };

      // Act
      pageInstance.onRecordTap(mockEvent);

      // Assert
      expect(mockWx.navigateTo).toHaveBeenCalledTimes(1);
      expect(mockWx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/detail/detail?id=0'
      });
    });

    test('should handle ID with special characters', () => {
      // Arrange
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: 'test_123-abc!@#'
          }
        }
      };

      // Act
      pageInstance.onRecordTap(mockEvent);

      // Assert
      expect(mockWx.navigateTo).toHaveBeenCalledTimes(1);
      expect(mockWx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/detail/detail?id=test_123-abc!@#'
      });
    });

    test('should handle very long ID', () => {
      // Arrange
      const longId = 'a'.repeat(1000);
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: longId
          }
        }
      };

      // Act
      pageInstance.onRecordTap(mockEvent);

      // Assert
      expect(mockWx.navigateTo).toHaveBeenCalledTimes(1);
      expect(mockWx.navigateTo).toHaveBeenCalledWith({
        url: `/pages/detail/detail?id=${longId}`
      });
    });
  });

  describe('Error cases - missing or invalid data', () => {
    test('should handle missing id in dataset', () => {
      // Arrange
      const mockEvent = {
        currentTarget: {
          dataset: {}
        }
      };

      // Act
      pageInstance.onRecordTap(mockEvent);

      // Assert
      expect(mockWx.navigateTo).toHaveBeenCalledTimes(1);
      expect(mockWx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/detail/detail?id=undefined'
      });
    });

    test('should handle missing dataset', () => {
      // Arrange
      const mockEvent = {
        currentTarget: {}
      };

      // Act & Assert
      expect(() => {
        pageInstance.onRecordTap(mockEvent);
      }).toThrow();
    });

    test('should handle missing currentTarget', () => {
      // Arrange
      const mockEvent = {};

      // Act & Assert
      expect(() => {
        pageInstance.onRecordTap(mockEvent);
      }).toThrow();
    });

    test('should handle null id', () => {
      // Arrange
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: null
          }
        }
      };

      // Act
      pageInstance.onRecordTap(mockEvent);

      // Assert
      expect(mockWx.navigateTo).toHaveBeenCalledTimes(1);
      expect(mockWx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/detail/detail?id=null'
      });
    });
  });

  describe('wx.navigateTo behavior', () => {
    test('should call wx.navigateTo exactly once per onRecordTap call', () => {
      // Arrange
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: 'test-123'
          }
        }
      };

      // Act
      pageInstance.onRecordTap(mockEvent);

      // Assert
      expect(mockWx.navigateTo).toHaveBeenCalledTimes(1);
    });

    test('should pass correct URL structure to navigateTo', () => {
      // Arrange
      const mockEvent = {
        currentTarget: {
          dataset: {
            id: 'abc123'
          }
        }
      };

      // Act
      pageInstance.onRecordTap(mockEvent);

      // Assert
      const callArgs = mockWx.navigateTo.mock.calls[0][0];
      expect(callArgs).toHaveProperty('url');
      expect(callArgs.url).toContain('/pages/detail/detail?id=');
      expect(callArgs.url).toContain('abc123');
    });
  });

  describe('Multiple calls', () => {
    test('should handle multiple consecutive calls correctly', () => {
      // Arrange
      const mockEvent1 = {
        currentTarget: {
          dataset: {
            id: 'record-1'
          }
        }
      };
      const mockEvent2 = {
        currentTarget: {
          dataset: {
            id: 'record-2'
          }
        }
      };

      // Act
      pageInstance.onRecordTap(mockEvent1);
      pageInstance.onRecordTap(mockEvent2);

      // Assert
      expect(mockWx.navigateTo).toHaveBeenCalledTimes(2);
      expect(mockWx.navigateTo).toHaveBeenNthCalledWith(1, {
        url: '/pages/detail/detail?id=record-1'
      });
      expect(mockWx.navigateTo).toHaveBeenNthCalledWith(2, {
        url: '/pages/detail/detail?id=record-2'
      });
    });
  });
});
