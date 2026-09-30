import math, sys, json
def rock_path(cx, cy, R, seed=3):
    import random
    rnd = random.Random(seed)
    n = 11
    pts = []
    for i in range(n):
        a = i / n * 2 * math.pi
        r = R * (0.9 + rnd.random() * 0.16)
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    # smooth closed curve through midpoints
    d = ''
    for i in range(n):
        p0 = pts[i]; p1 = pts[(i + 1) % n]
        mid = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
        if i == 0:
            m0 = ((pts[-1][0] + p0[0]) / 2, (pts[-1][1] + p0[1]) / 2)
            d += f'M {m0[0]:.1f} {m0[1]:.1f} '
        d += f'Q {p0[0]:.1f} {p0[1]:.1f} {mid[0]:.1f} {mid[1]:.1f} '
    return d + 'Z'

def hero(v, bg=True, planet=True):
    W = 1024
    ix, iy = 512, 792          # impact
    pcy, pr = 1700, 1030       # planet
    ux, uy = 0.40, -0.9165     # toward the tail (up-right); the meteor flies straight at the impact
    nx, ny = -uy, ux           # perpendicular
    R = 132
    hx, hy = ix + ux * 370, iy + uy * 370
    L = 470
    ex, ey = hx + ux * L, hy + uy * L
    w = R * 0.86
    tail = f'M {hx+nx*w:.1f} {hy+ny*w:.1f} Q {hx+nx*w*1.05+ux*L*0.45:.1f} {hy+ny*w*1.05+uy*L*0.45:.1f} {ex:.1f} {ey:.1f} Q {hx-nx*w*1.05+ux*L*0.45:.1f} {hy-ny*w*1.05+uy*L*0.45:.1f} {hx-nx*w:.1f} {hy-ny*w:.1f} Z'
    w2 = R * 1.35; L2 = L * 1.08
    ex2, ey2 = hx + ux * L2, hy + uy * L2
    glowtail = f'M {hx+nx*w2:.1f} {hy+ny*w2:.1f} L {ex2:.1f} {ey2:.1f} L {hx-nx*w2:.1f} {hy-ny*w2:.1f} Z'
    lines = ''
    for off, a, b, sw, op in [(1.25, 1.5, 2.9, 11, 0.6), (-1.25, 1.9, 2.8, 9, 0.45)]:
        sx, sy = hx + nx * R * off + ux * R * a, hy + ny * R * off + uy * R * a
        tx, ty = hx + nx * R * off + ux * R * b, hy + ny * R * off + uy * R * b
        lines += f'<line x1="{sx:.1f}" y1="{sy:.1f}" x2="{tx:.1f}" y2="{ty:.1f}" stroke="#FFFFFF" stroke-opacity="{op}" stroke-width="{sw}" stroke-linecap="round"/>'
    rings = ''
    for rx, col, op, sw in [(370, v['r3'], 0.6, 12), (262, v['r2'], 0.85, 14), (162, v['r1'], 1, 16)]:
        rings += f'<ellipse cx="{ix}" cy="{iy}" rx="{rx}" ry="{rx*0.25:.0f}" fill="none" stroke="{col}" stroke-opacity="{op}" stroke-width="{sw}"/>'
    craters = ''
    for a, b, rx, ry in [(-30, -34, 30, 26), (40, 16, 36, 31), (-46, 48, 18, 15), (24, -62, 14, 12), (58, 64, 12, 10)]:
        craters += f'<ellipse cx="{hx+a}" cy="{hy+b}" rx="{rx}" ry="{ry}" fill="{v["crater"]}" opacity="0.9"/>'
        craters += f'<ellipse cx="{hx+a-4}" cy="{hy+b+5}" rx="{rx*0.8:.1f}" ry="{ry*0.6:.1f}" fill="#FFFFFF" opacity="0.18"/>'
    stars = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff" opacity="{o}"/>' for x, y, r, o in [(170, 190, 5, .55), (300, 110, 3.5, .4), (140, 430, 3.5, .35), (330, 330, 3, .35), (905, 520, 4, .35), (245, 560, 3, .3), (880, 330, 3, .3)])
    bgsvg = f'<rect width="{W}" height="{W}" fill="url(#bg)"/>' + stars if bg else ''
    planetsvg = f'<circle cx="512" cy="{pcy}" r="{pr+40}" fill="url(#atmo)"/><circle cx="512" cy="{pcy}" r="{pr}" fill="url(#planet)"/>' if planet else ''
    clip = 'clip-path="url(#onplanet)"' if planet else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{W}" viewBox="0 0 {W} {W}">
<defs>
 <linearGradient id="bg" x1="0.2" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="{v['bg'][0]}"/><stop offset="0.6" stop-color="{v['bg'][1]}"/><stop offset="1" stop-color="{v['bg'][2]}"/></linearGradient>
 <radialGradient id="planet" cx="0.5" cy="0" r="0.6"><stop offset="0" stop-color="{v['planet'][0]}"/><stop offset="1" stop-color="{v['planet'][1]}"/></radialGradient>
 <radialGradient id="flash" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.25" stop-color="#FFE7B0"/><stop offset="0.6" stop-color="{v['hot']}" stop-opacity="0.55"/><stop offset="1" stop-color="{v['hot']}" stop-opacity="0"/></radialGradient>
 <radialGradient id="ringfill" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="{v['r1']}" stop-opacity="0.55"/><stop offset="0.6" stop-color="{v['r3']}" stop-opacity="0.2"/><stop offset="1" stop-color="{v['r3']}" stop-opacity="0"/></radialGradient>
 <linearGradient id="tail" gradientUnits="userSpaceOnUse" x1="{hx}" y1="{hy}" x2="{ex:.1f}" y2="{ey:.1f}"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.18" stop-color="#FFE9B8"/><stop offset="0.45" stop-color="{v['hot']}" stop-opacity="0.85"/><stop offset="1" stop-color="{v['hot2']}" stop-opacity="0"/></linearGradient>
 <linearGradient id="glowtail" gradientUnits="userSpaceOnUse" x1="{hx}" y1="{hy}" x2="{ex2:.1f}" y2="{ey2:.1f}"><stop offset="0" stop-color="{v['hot2']}" stop-opacity="0.7"/><stop offset="1" stop-color="{v['hot2']}" stop-opacity="0"/></linearGradient>
 <radialGradient id="rock" gradientUnits="userSpaceOnUse" cx="{hx-R*0.45:.0f}" cy="{hy+R*0.45:.0f}" r="{R*1.55:.0f}"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.3" stop-color="{v['rock'][0]}"/><stop offset="0.75" stop-color="{v['rock'][1]}"/><stop offset="1" stop-color="{v['rock'][2]}"/></radialGradient>
 <radialGradient id="sheath" gradientUnits="userSpaceOnUse" cx="{hx-R*0.35:.0f}" cy="{hy+R*0.35:.0f}" r="{R*1.35:.0f}"><stop offset="0.6" stop-color="{v['hot']}" stop-opacity="0.9"/><stop offset="1" stop-color="{v['hot']}" stop-opacity="0"/></radialGradient>
 <radialGradient id="atmo" cx="0.5" cy="0.5" r="0.5"><stop offset="0.965" stop-color="{v['atmo']}" stop-opacity="0"/><stop offset="0.985" stop-color="{v['atmo']}" stop-opacity="0.9"/><stop offset="1" stop-color="{v['atmo']}" stop-opacity="0"/></radialGradient>
 <clipPath id="onplanet"><circle cx="512" cy="{pcy}" r="{pr}"/></clipPath>
 <filter id="b12" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
 <filter id="b28" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
 <filter id="b6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>
{bgsvg}
{planetsvg}
<g {clip}>
  <ellipse cx="{ix}" cy="{iy}" rx="400" ry="100" fill="url(#ringfill)"/>
  <g filter="url(#b6)" opacity="0.8">{rings}</g>
  {rings}
</g>
<ellipse cx="{ix}" cy="{iy-14}" rx="190" ry="120" fill="url(#flash)" filter="url(#b12)"/>
<ellipse cx="{ix}" cy="{iy}" rx="74" ry="22" fill="#FFFFFF"/>
<path d="{glowtail}" fill="url(#glowtail)" filter="url(#b28)"/>
{lines}
<path d="{tail}" fill="url(#tail)"/>
<circle cx="{hx}" cy="{hy}" r="{R*1.3:.0f}" fill="url(#sheath)" filter="url(#b12)"/>
<path d="{rock_path(hx, hy, R)}" fill="url(#rock)"/>
{craters}
</svg>'''

V = {
 'violet': dict(bg=['#6A4BFF', '#3726D6', '#170F66'], planet=['#2A3AB8', '#0B0D3A'], atmo='#7FD3FF', hot='#FF8A3D', hot2='#FF4F6D',
                  r1='#FFD166', r2='#FF8A3D', r3='#FF5A4A', rock=['#FFE8C8', '#C7B8E8', '#5B4AA8'], crater='#6B58B8'),
 'midnight': dict(bg=['#3A2F9F', '#1A1760', '#070918'], planet=['#1E3A8A', '#060A24'], atmo='#5FD0FF', hot='#FF8A3D', hot2='#FF4F6D',
                  r1='#FFD166', r2='#FF8A3D', r3='#FF5A4A', rock=['#FFE8C8', '#B8B0D8', '#433A80'], crater='#554A98'),
}
open('out_icon.svg','w').write(hero(V['violet']))
open('out_icon_dark.svg','w').write(hero(V['midnight']))
open('out_mark.svg','w').write(hero(V['violet'], bg=False, planet=False))
open('out_bg.svg','w').write(hero(V['violet']).split('<g ')[0].split('<circle cx="512" cy="1700"')[0] + '</svg>')
