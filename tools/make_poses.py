"""Generates the local pose gallery (transparent-background figures) + js/poses.js.
Replace assets/poses/*.svg with real photos any time and edit js/poses.js."""
import json
D=[
("Hands in Pockets","Standing",[(150,60),(150,95),(150,250),(112,170),(128,240),(188,170),(172,240),(140,360),(136,465),(160,360),(164,465)]),
("Arms Crossed","Standing",[(150,60),(150,95),(150,250),(115,175),(165,165),(185,175),(135,168),(140,360),(138,465),(160,360),(162,465)]),
("Power Stance","Standing",[(150,60),(150,95),(150,250),(105,170),(125,238),(195,170),(175,238),(120,360),(100,465),(180,360),(200,465)]),
("Confident Stride","Walking",[(150,60),(152,95),(150,250),(185,175),(195,235),(115,175),(105,235),(125,355),(95,462),(175,350),(190,440)]),
("Easy Walk","Casual",[(150,60),(150,95),(150,250),(112,170),(128,240),(190,185),(205,245),(130,360),(108,465),(172,352),(195,455)]),
("Wall Lean","Leaning",[(185,62),(180,97),(165,250),(145,172),(168,238),(215,175),(228,150),(160,360),(140,465),(170,360),(205,462)]),
("Relaxed Lean","Casual",[(175,62),(172,97),(160,250),(125,172),(145,242),(200,175),(180,242),(150,360),(130,465),(175,360),(195,462)]),
("Chair Sit","Sitting",[(110,110),(110,145),(110,290),(90,225),(150,265),(145,225),(190,270),(205,295),(210,415),(215,305),(225,420)]),
("Ground Sit","Sitting",[(120,140),(120,175),(115,310),(150,250),(210,215),(95,260),(130,330),(200,230),(215,400),(225,260),(250,405)]),
("Mirror Selfie","Mirror selfies",[(150,60),(150,95),(150,250),(112,170),(128,240),(190,180),(165,150),(140,360),(135,465),(162,360),(170,465)]),
("Contrapposto","Fashion poses",[(155,60),(152,95),(145,250),(100,180),(130,245),(195,175),(185,240),(138,360),(125,465),(185,345),(205,455)]),
("Look Back","Street photography",[(160,60),(152,95),(150,250),(118,170),(120,242),(190,170),(170,115),(128,355),(105,462),(172,350),(185,445)]),
("Collar Fix","Fashion poses",[(150,60),(150,95),(150,250),(112,172),(128,242),(185,150),(160,100),(140,360),(135,465),(162,360),(168,465)]),
]
PAL=[("#2b3a55","#e8e6e1","#c98f6b","#1c1410"),("#3a2e2a","#6b7f5e","#a9714f","#0f0c0a"),("#1d1d22","#b8b8c2","#d9a77e","#2a1d14"),
("#33415c","#a3342f","#8a5a3b","#111111"),("#4a4036","#2f5d62","#c58e68","#3b2a1d"),("#22252b","#d1a14a","#b07d58","#0c0a09"),("#41506b","#efece4","#d3a07a","#241913")]
def pl(p,w,c): return '<path d="M%d %d%s" stroke="%s" stroke-width="%d" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'%(p[0][0],p[0][1],''.join('L%d %d'%q for q in p[1:]),c,w)
def fig(i,P,mirror):
    pants,shirt,skin,hair=PAL[i%len(PAL)]
    hd,nk,pv,eL,hL,eR,hR,kL,fL,kR,fR=P
    sL=(nk[0]-30,nk[1]+8);sR=(nk[0]+30,nk[1]+8);aL=(pv[0]-20,pv[1]);aR=(pv[0]+20,pv[1])
    o=[pl([aL,kL,fL],32,pants),pl([aR,kR,fR],32,pants)]
    for f in (fL,fR): o.append('<ellipse cx="%d" cy="%d" rx="22" ry="10" fill="#e9e9ee"/>'%(f[0]+4,f[1]+12))
    o.append('<polygon points="%s" fill="%s" stroke="%s" stroke-width="12" stroke-linejoin="round"/>'%(' '.join('%d,%d'%q for q in (sL,sR,aR,aL)),shirt,shirt))
    o.append(pl([nk,pv],7,"#00000033"))
    o+=[pl([sL,eL,hL],25,shirt),pl([sR,eR,hR],25,shirt)]
    for h in (hL,hR): o.append('<circle cx="%d" cy="%d" r="11" fill="%s"/>'%(h[0],h[1],skin))
    if mirror: o.append('<rect x="%d" y="%d" width="16" height="28" rx="3" fill="#15151a" stroke="#888"/>'%(hR[0]-8,hR[1]-30))
    o.append(pl([hd,nk],16,skin))
    o.append('<circle cx="%d" cy="%d" r="27" fill="%s"/>'%(hd[0],hd[1],skin))
    o.append('<path d="M%d %dA27 27 0 0 1 %d %dQ%d %d %d %dZ" fill="%s"/>'%(hd[0]-28,hd[1]-2,hd[0]+28,hd[1]-2,hd[0],hd[1]-14,hd[0]-28,hd[1]-2,hair))
    return '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="500" viewBox="0 0 300 500">%s</svg>'%''.join(o)
POP={1,3,6,10};TR={2,4,8,11,12};NEW={5,7,9,13}
out=[]
for n,(name,cat,P) in enumerate(D,1):
    open('assets/poses/p%02d.svg'%n,'w').write(fig(n,P,cat=="Mirror selfies"))
    out.append(dict(id="p%02d"%n,name=name,cat=cat,src="assets/poses/p%02d.svg"%n,pop=n in POP,trend=n in TR,fresh=n in NEW))
cats=["Standing","Sitting","Mirror selfies","Casual","Street photography","Fashion poses","Leaning","Walking"]
open('js/poses.js','w').write("// Gallery data. To use real photos: drop them in assets/poses/ and add an entry here.\nexport const CATS=%s;\nexport const POSES=%s;\n"%(json.dumps(cats),json.dumps(out,indent=1)))
