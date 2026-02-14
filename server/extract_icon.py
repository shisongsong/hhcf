#!/usr/bin/env python3
from PIL import Image

def extract_icon_by_contrast(input_path, output_path, target_hex="#FFB300", contrast_threshold=250):
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    target_r = int(target_hex[1:3], 16)
    target_g = int(target_hex[3:5], 16)
    target_b = int(target_hex[5:7], 16)
    
    new_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = img.getpixel((x, y))
            
            brightness = (r + g + b) / 3
            
            if brightness < contrast_threshold:
                new_img.putpixel((x, y), (target_r, target_g, target_b, 255))
    
    bbox = new_img.getbbox()
    
    if bbox is not None:
        margin = 20
        left = max(0, bbox[0] - margin)
        top = max(0, bbox[1] - margin)
        right = min(width, bbox[2] + margin)
        bottom = min(height, bbox[3] + margin)
        
        cropped = new_img.crop((left, top, right, bottom))
        cropped.save(output_path, "PNG")
        print(f"图标已保存到: {output_path}")
        print(f"图像尺寸: {cropped.size}")
    else:
        print("未能检测到图标内容，请尝试调整对比度阈值")

if __name__ == "__main__":
    input_file = "/Volumes/huanyin/Workstation/opencode-home/hhcf/miniprogram/images/meal-icons/dinner.png"
    output_file = "/Volumes/huanyin/Workstation/opencode-home/hhcf/miniprogram/images/meal-icons/dinner_icon.png"
    
    extract_icon_by_contrast(input_file, output_file, "#2196F3", contrast_threshold=200)
