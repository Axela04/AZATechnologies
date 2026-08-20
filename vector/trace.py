import numpy as np, subprocess, re, json
from collections import deque

HUB_T = (1214.1, 1541.8); HUB_B = (1299.6, 1540.0)

def write_pbm(mask, path):
    h, w = mask.shape
    with open(path,'wb') as f:
        f.write(b'P4\n%d %d\n' % (w,h)); f.write(np.packbits(mask.astype(np.uint8),axis=1).tobytes())

def read_pbm(path):
    raw = open(path,'rb').read()
    m = re.match(rb'P4\s+(\d+)\s+(\d+)\s', raw)
    w, h = int(m.group(1)), int(m.group(2))
    data = raw[m.end():]
    return np.unpackbits(np.frombuffer(data,np.uint8).reshape(h,-1),axis=1)[:, :w].astype(bool)

def morph_open(mask, radius):
    """Remove thin protrusions / specks via ImageMagick disk opening."""
    write_pbm(mask, '/tmp/_mo_in.pbm')
    subprocess.run(['convert','/tmp/_mo_in.pbm','-negate',
                    '-morphology','Open',f'Disk:{radius}',
                    '-negate','/tmp/_mo_out.pbm'], check=True)
    return read_pbm('/tmp/_mo_out.pbm')

def largest_cc(mask):
    h,w = mask.shape; lab = np.zeros((h,w),np.int32); cur=0; best=(0,0)
    for sy in range(h):
        for sx in np.where(mask[sy] & (lab[sy]==0))[0]:
            cur+=1; n=0; dq=deque([(sy,sx)]); lab[sy,sx]=cur
            while dq:
                y,x=dq.popleft(); n+=1
                for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                    ny,nx=y+dy,x+dx
                    if 0<=ny<h and 0<=nx<w and mask[ny,nx] and lab[ny,nx]==0:
                        lab[ny,nx]=cur; dq.append((ny,nx))
            if n>best[1]: best=(cur,n)
    return lab==best[0]

def drop_specks(mask, min_area):
    h,w = mask.shape; lab=np.zeros((h,w),np.int32); cur=0; keep=np.zeros_like(mask)
    for sy in range(h):
        for sx in np.where(mask[sy] & (lab[sy]==0))[0]:
            cur+=1; px=[]; dq=deque([(sy,sx)]); lab[sy,sx]=cur
            while dq:
                y,x=dq.popleft(); px.append((y,x))
                for dy,dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                    ny,nx=y+dy,x+dx
                    if 0<=ny<h and 0<=nx<w and mask[ny,nx] and lab[ny,nx]==0:
                        lab[ny,nx]=cur; dq.append((ny,nx))
            if len(px)>=min_area:
                a=np.array(px); keep[a[:,0],a[:,1]]=True
    return keep

card = np.load('/tmp/t_card_main.npy')
holes = np.load('/tmp/t_holes.npy')
# Opening removes the binder punch-hole nub and the torn-edge notch,
# then keep the single largest blob; holes are re-punched afterwards.
solid = morph_open(card | holes, 20)
solid = largest_cc(solid)
card_clean = solid & ~holes
ys, xs = np.where(card_clean)
print(f"card_clean {card_clean.sum():,}px  r_max={np.hypot(xs-HUB_T[0],ys-HUB_T[1]).max():.0f}")

dark = np.load('/tmp/t_dark_c.npy') & card_clean
red  = np.load('/tmp/t_red_c.npy')  & card_clean
red  = drop_specks(red, 60)
dark = drop_specks(dark, 12)
print(f"dark {dark.sum():,}  red {red.sum():,}")

ink = np.load('/tmp/b_ink_c.npy').copy()
ink[1575:1650, 1215:1390] = False                       # part number
yy,xx = np.mgrid[0:ink.shape[0],0:ink.shape[1]]
ink[np.hypot(xx-HUB_B[0],yy-HUB_B[1]) < 55] = False     # grommet ring
ink = drop_specks(ink, 12)
print(f"disc ink {ink.sum():,}")

def potrace(mask, name, turd=2, alpha=1.0, opt=0.2):
    write_pbm(mask, f'/tmp/p_{name}.pbm')
    subprocess.run(['potrace','-b','svg','-t',str(turd),'-a',str(alpha),
                    '-O',str(opt),'-o',f'/tmp/p_{name}.svg',f'/tmp/p_{name}.pbm'], check=True)
    s = open(f'/tmp/p_{name}.svg').read()
    g = re.search(r'<g transform="([^"]+)"[^>]*>(.*?)</g>', s, re.S)
    d = ' '.join(re.findall(r'<path d="([^"]+)"', g.group(2)))
    print(f"  {name}: {len(d):,} chars")
    return g.group(1), d

out = {'hub_t':HUB_T, 'hub_b':HUB_B}
out['disc'] = potrace(ink,        'disc', turd=2,  alpha=1.0, opt=0.25)
out['card'] = potrace(card_clean, 'card', turd=60, alpha=1.0, opt=0.3)
out['ink']  = potrace(dark,       'ink',  turd=1,  alpha=1.0, opt=0.25)
out['red']  = potrace(red,        'red',  turd=1,  alpha=1.0, opt=0.25)
json.dump(out, open('/tmp/traced.json','w'))
print("total path chars:", sum(len(out[k][1]) for k in ('disc','card','ink','red')))
