#!/usr/bin/env python3
"""生成过去30天的测试数据"""

import json
import random
from datetime import datetime, timedelta
from uuid import uuid4

# 保持现有的openid
OPENID = "80467148-c77c-4c53-b6dd-d97cd1295371"

# 现有的图片URL（复用）
IMAGE_URLS = [
    "http://t9q8ibxr3.hn-bkt.clouddn.com/eating/80467148-c77c-4c53-b6dd-d97cd1295371/1769865258946.jpg",
    "http://t9q8ibxr3.hn-bkt.clouddn.com/eating/80467148-c77c-4c53-b6dd-d97cd1295371/1769866934464.jpg",
    "http://t9q8ibxr3.hn-bkt.clouddn.com/eating/1769867168893.jpg",
]

MEAL_TYPES = [
    ("breakfast", "早餐打卡", "🌅"),
    ("lunch", "午餐打卡", "🌞"),
    ("dinner", "晚餐打卡", "🌙"),
    ("snack", "加餐打卡", "➕"),
]

def generate_test_data():
    """生成30天的测试数据"""
    records = []
    
    # 从今天往回30天
    today = datetime.now()
    
    for days_ago in range(30, -1, -1):
        date = today - timedelta(days=days_ago)
        
        # 每天随机1-3顿饭
        num_meals = random.randint(1, 3)
        selected_meals = random.sample(MEAL_TYPES, k=num_meals)
        
        for meal_type, title, _ in selected_meals:
            # 生成随机时间
            if meal_type == "breakfast":
                hour = random.randint(7, 9)
            elif meal_type == "lunch":
                hour = random.randint(11, 13)
            elif meal_type == "dinner":
                hour = random.randint(18, 20)
            else:  # snack
                hour = random.choice([10, 15, 21, 22])
            
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            
            timestamp = int(date.replace(hour=hour, minute=minute, second=second).timestamp() * 1000)
            
            record = {
                "id": str(uuid4()),
                "openid": OPENID,
                "imageUrl": random.choice(IMAGE_URLS),
                "mealType": meal_type,
                "title": title,
                "timestamp": timestamp,
                "createdAt": date.replace(hour=hour, minute=minute, second=second).isoformat() + "Z"
            }
            records.append(record)
    
    # 按时间倒序排序
    records.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return records

if __name__ == "__main__":
    records = generate_test_data()
    data = {"records": records}
    
    # 写入文件
    with open("db.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"生成了 {len(records)} 条测试数据")
    print(f"时间范围: {datetime.fromtimestamp(records[-1]['timestamp']/1000).strftime('%Y-%m-%d')} 到 {datetime.fromtimestamp(records[0]['timestamp']/1000).strftime('%Y-%m-%d')}")
