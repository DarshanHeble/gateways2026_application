import os
from PIL import Image

assets_dir = "/home/darshan/Projects/gateways2026_application/assets/images"

def compress_image(filename):
    filepath = os.path.join(assets_dir, filename)
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        return

    img = Image.open(filepath)
    # Save as webp or optimized png
    new_filepath = filepath.replace('.png', '.webp')
    img.save(new_filepath, format="webp", quality=80)
    print(f"Compressed {filename} to {new_filepath}")
    
    # if it's a huge png, we can just replace the png with a highly compressed version of itself
    if filename == "minecraft_bg.png":
        img = img.convert("RGB") # drop alpha if not needed for bg
        img.save(filepath, format="jpeg", quality=60)
        print(f"Overwrote {filename} with compressed jpeg data")
    else:
        # Just optimize the PNG in place
        img.save(filepath, format="png", optimize=True)
        print(f"Optimized {filename}")

compress_image("minecraft_bg.png")
compress_image("logo-glow.png")
compress_image("icon.png")

