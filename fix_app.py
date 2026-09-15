import os

def remove_borders(file_path):
    with open(file_path, "r") as f:
        content = f.read()
    
    new_lines = []
    lines = content.split('\n')
    for line in lines:
        if 'borderRadius' in line or 'borderWidth' in line or 'borderBottomLeftRadius' in line or 'borderBottomRightRadius' in line or 'borderTopLeftRadius' in line or 'borderTopRightRadius' in line:
            if 'anim' in line or 'ambientAura' in line or 'borderRadius: SCREEN_W' in line or 'borderRadius: px(160)' in line or 'borderRadius: px(200)' in line or 'borderRadius: px(225)' in line or 'borderRadius: px(190)' in line:
                new_lines.append(line)
            else:
                continue
        else:
            new_lines.append(line)

    with open(file_path, "w") as f:
        f.write('\n'.join(new_lines))


files = [
    'src/app/(tabs)/index.tsx',
    'src/app/(tabs)/profile.tsx',
    'src/app/(tabs)/events.tsx',
    'src/app/(tabs)/schedule.tsx',
    'src/app/(tabs)/notifications.tsx',
    'src/app/(tabs)/_layout.tsx'
]

for file in files:
    if os.path.exists(file):
        remove_borders(file)
