function formatTime(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    full: `${year}.${month}.${day} ${hour}:${minute}`,
    short: `${month}.${day}`,
    displayDate: `${month}月${day}日`,
  };
}

function formatGroupTitle(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const todayStr = formatTime(now).date;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatTime(yesterday).date;
  const targetStr = formatTime(date).date;

  if (targetStr === todayStr) {
    return '今天';
  } else if (targetStr === yesterdayStr) {
    return '昨天';
  } else {
    return formatTime(date).displayDate;
  }
}

function isSameDay(timestamp1, timestamp2) {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

function throttle(fn, interval = 300) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

function getImageSuffix(filePath) {
  if (filePath.startsWith('cloud://')) {
    return '';
  }
  const ext = filePath.split('.').pop().toLowerCase();
  return ext;
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }
}

module.exports = {
  formatTime,
  formatGroupTitle,
  isSameDay,
  debounce,
  throttle,
  getImageSuffix,
  formatFileSize,
};
