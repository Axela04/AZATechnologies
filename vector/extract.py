import numpy as np, subprocess
from collections import deque

def load_rgb(path):
    out = subprocess.run(['convert', path, '-depth','8','ppm:-'],
                         capture_output=True, check=True).stdout
    parts, idx = [], 0
    while len(parts) < 4:
        while out[idx:idx+1].isspace(): idx += 1
        if out[idx:idx+1] == b'#':
            while out[idx:idx+1] != b'\n': idx += 1
            continue
        j = idx
        while not out[j:j+1].isspace(): j += 1
        parts.append(out[idx:j]); idx = j
    idx += 1
    w, h = int(parts[1]), int(parts[2])
    return np.frombuffer(out[idx:idx+w*h*3], np.uint8).reshape(h, w, 3)

def flood_border(mask):
    h, w = mask.shape
    seen = np.zeros_like(mask, bool); dq = deque()
    ys, xs = np.where(mask[[0,h-1], :]); 
    for yy, xx in zip(ys, xs):
        y = 0 if yy == 0 else h-1
        if not seen[y, xx]: seen[y, xx] = True; dq.append((y, xx))
    ys, xs = np.where(mask[:, [0,w-1]])
    for yy, xx in zip(ys, xs):
        x = 0 if xx == 0 else w-1
        if not seen[yy, x]: seen[yy, x] = True; dq.append((yy, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny,nx] and not seen[ny,nx]:
                seen[ny,nx] = True; dq.append((ny,nx))
    return seen

def write_pbm(mask, path):
    """mask True -> black (potrace traces black)."""
    h, w = mask.shape
    packed = np.packbits(mask.astype(np.uint8), axis=1)
    with open(path, 'wb') as f:
        f.write(b'P4\n%d %d\n' % (w, h))
        f.write(packed.tobytes())

# ---------------- TOP CARD ----------------
top = load_rgb('/tmp/hi-top-1.png').astype(np.int16)
H, W, _ = top.shape
r, g, b = top[:,:,0], top[:,:,1], top[:,:,2]

blue    = (b - (r+g)//2 > 33) & (b > 90)
outside = flood_border(blue)
holes   = blue & ~outside
white_margin = flood_border(~blue & (r>200)&(g>200)&(b>200))
card    = ~blue & ~white_margin           # card body incl. print
card_filled = card | holes                # solid disc before punching

HUB_T = (1214.1, 1541.8)

# card extent relative to hub
ys, xs = np.where(card)
d = np.hypot(xs - HUB_T[0], ys - HUB_T[1])
print(f"TOP card: {card.sum():,} px, max radius from hub = {d.max():.0f}")

# print layers (only inside the card)
lum   = (0.299*r + 0.587*g + 0.114*b)
dark  = card & (lum < 128)
red   = card & (r - np.maximum(g, b) > 45) & (r > 90)

print(f"TOP dark px: {dark.sum():,}   red px: {red.sum():,}")

np.save('/tmp/t_card.npy', card)
np.save('/tmp/t_holes.npy', holes)
np.save('/tmp/t_dark.npy', dark)
np.save('/tmp/t_red.npy', red)

# ---------------- BOTTOM DISC ----------------
bot = load_rgb('/tmp/hib-1.png').astype(np.int16)
Hb, Wb, _ = bot.shape
rb, gb, bb = bot[:,:,0], bot[:,:,1], bot[:,:,2]
lumb = (0.299*rb + 0.587*gb + 0.114*bb)
HUB_B = (1299.6, 1540.0)

ink = lumb < 150
# drop the cyan grommet itself from the ink layer
grommet = (bb - (rb+gb)//2 > 25) & (bb > 90)
ink = ink & ~grommet
ys, xs = np.where(ink)
d = np.hypot(xs - HUB_B[0], ys - HUB_B[1])
print(f"BOTTOM ink: {ink.sum():,} px, radius p99.9 = {np.percentile(d,99.9):.0f}, max = {d.max():.0f}")
np.save('/tmp/b_ink.npy', ink)

print("HUB_T", HUB_T, "HUB_B", HUB_B)
