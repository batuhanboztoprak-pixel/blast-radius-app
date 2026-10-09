# Generates assets/crater.png (procedural fresh impact crater). Usage: python3 scripts/build-crater.py assets/crater.png  (then resize to 768 px)
import numpy as np, sys
from PIL import Image, ImageFilter
N=1024; rng=np.random.default_rng(7)
y,x=np.mgrid[0:N,0:N].astype(float); x=(x-N/2)/(N/2); y=(y-N/2)/(N/2)
r=np.hypot(x,y); th=np.arctan2(y,x)
RC=1/3
def noise(scale,oct=5,seed=0):
    g0=np.random.default_rng(seed); out=np.zeros((N,N))
    for o in range(oct):
        s=max(2,int(scale*2**o)); g=g0.standard_normal((s+1,s+1))
        out+=np.asarray(Image.fromarray(g.astype(np.float32),mode='F').resize((N,N),Image.BICUBIC))/(1.9**o)
    return out/np.abs(out).max()
n1=noise(5,seed=1); n2=noise(28,3,seed=2); n3=noise(60,2,seed=3)
# irregular rim: radius wobbles with angle
ang=np.zeros_like(th)
for k,amp in ((3,0.03),(5,0.018),(8,0.007)):
    ang+=amp*np.sin(k*th+rng.uniform(0,6.28))
rr=r/(RC*(1+ang))
# rays: many thin, broken, branching
rays=np.zeros((N,N))
for i in range(70):
    a=rng.uniform(-np.pi,np.pi); w=rng.uniform(0.006,0.03); Lr=rng.uniform(1.6,2.95); s=rng.uniform(0.35,1.0)
    d=np.angle(np.exp(1j*(th-a)))
    brk=np.clip(0.6+0.8*noise(3,2,seed=100+i) if i<20 else 1,0,1) if False else 1
    rays+=s*np.exp(-(d/(w*(1+0.6*(rr-1))))**2)*np.clip((Lr-rr)/(Lr-1),0,1)**0.7*(rr>1)
rays=np.clip(rays*(0.75+0.5*n2),0,1.2)
# height field
h=np.where(rr<1,-0.75*np.clip(1-rr**2,0,None)**0.8,0.0)
h+=0.32*np.exp(-((rr-1.0)/0.11)**2)*(1+0.3*n1)
h+=0.10*np.exp(-(rr-1)/0.7)*(rr>1)*(1+0.8*n1)
h+=0.06*rays
h+=0.035*n2+0.015*n3
h+=0.08*np.exp(-(rr/0.16)**2)  # small central uplift
gy,gx=np.gradient(h); s_=N*0.07
nx,ny,nz=-gx*s_,-gy*s_,np.ones_like(h); nl=np.sqrt(nx**2+ny**2+nz**2)
L=np.array([-0.5,-0.62,0.6]); L/=np.linalg.norm(L)
shade=np.clip((nx*L[0]+ny*L[1]+nz*L[2])/nl,0,1)
# colours
floor=np.array([0.30,0.25,0.21]); wall=np.array([0.46,0.40,0.34]); rimc=np.array([0.70,0.63,0.55]); ej=np.array([0.63,0.57,0.50]); ray=np.array([0.80,0.75,0.68])
t1=np.clip((rr-0.55)/0.4,0,1)[...,None]; alb=floor*(1-t1)+wall*t1
t2=np.clip((rr-0.92)/0.12,0,1)[...,None]; alb=alb*(1-t2)+rimc*t2
t3=np.clip((rr-1.15)/0.25,0,1)[...,None]; ejc=ej*(1-0.5*np.clip(rays,0,1)[...,None])+ray*0.5*np.clip(rays,0,1)[...,None]
alb=alb*(1-t3)+ejc*t3
alb*=(0.88+0.22*n2[...,None])
col=alb*(0.32+0.9*shade[...,None])
# fresh melt pool with a cracking crust
melt=np.clip(1-rr/0.5,0,1)**1.3
crack=np.clip(1-np.abs(n3)*6,0,1)  # thin bright veins
heat=np.clip(melt*(0.45+0.55*crack)*(0.8+0.3*n1),0,1)
glow=np.stack([1.0*heat,0.42*heat**1.3,0.10*heat**2.2],-1)
col=col*(1-0.8*heat[...,None])+glow
# alpha: solid crater, textured ejecta fading out
ej_a=np.clip(0.9*np.exp(-(rr-1.05)/0.5)*(0.8+0.3*n1)+0.6*rays,0,1)
a=np.where(rr<1.1,1.0,ej_a)
a*=np.clip((0.99-r)/0.06,0,1)
img=np.dstack([np.clip(col,0,1),np.clip(a,0,1)])
Image.fromarray((img*255).astype(np.uint8),'RGBA').filter(ImageFilter.SMOOTH).save(sys.argv[1])
