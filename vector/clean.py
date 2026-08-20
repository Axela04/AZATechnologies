import numpy as np
from collections import deque

def largest_cc(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32); cur = 0; best = (0, 0)
    for sy in range(h):
        row = mask[sy]
        for sx in np.where(row & (lab[sy] == 0))[0]:
            cur += 1; n = 0; dq = deque([(sy, sx)]); lab[sy, sx] = cur
            while dq:
                y, x = dq.popleft(); n += 1
                for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                    ny, nx = y+dy, x+dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny,nx] and lab[ny,nx] == 0:
                        lab[ny,nx] = cur; dq.append((ny,nx))
            if n > best[1]: best = (cur, n)
    return lab == best[0], best[1]

card = np.load('/tmp/t_card.npy')
card_main, n = largest_cc(card)
print(f"card largest CC: {n:,} of {card.sum():,}")
HUB_T = (1214.1, 1541.8)
ys, xs = np.where(card_main)
d = np.hypot(xs-HUB_T[0], ys-HUB_T[1])
print(f"  radius max {d.max():.0f}  p99.9 {np.percentile(d,99.9):.0f}")
print(f"  bbox x {xs.min()}-{xs.max()}  y {ys.min()}-{ys.max()}")
np.save('/tmp/t_card_main.npy', card_main)

# restrict print layers to the real card
for name in ('t_dark','t_red'):
    m = np.load(f'/tmp/{name}.npy') & card_main
    np.save(f'/tmp/{name}_c.npy', m)
    print(f"  {name}: {m.sum():,}")

# bottom: keep ink within a sane radius of the hub
ink = np.load('/tmp/b_ink.npy')
HUB_B = (1299.6, 1540.0)
yy, xx = np.mgrid[0:ink.shape[0], 0:ink.shape[1]]
rad = np.hypot(xx-HUB_B[0], yy-HUB_B[1])
ink_c = ink & (rad <= 1120)
print(f"bottom ink clipped: {ink_c.sum():,} of {ink.sum():,}")
np.save('/tmp/b_ink_c.npy', ink_c)
