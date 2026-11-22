"""Render bilingual diagrams for the Yuanmou and Lantian history essay."""
from pathlib import Path
import json
import re

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import FancyBboxPatch, Polygon, Rectangle

HERE = Path(__file__).resolve().parent
SITE = HERE.parents[2]
DESTINATION = SITE / "public/images/personal/early-humans"
FONT = SITE / "scripts/fonts/NotoSansSC-Regular.ttf"
PAPER, INK, TEAL, MUTED, LINE, OCHRE = "#fcf9f2", "#193341", "#167b82", "#546773", "#cbc6b9", "#aa713b"
matplotlib.rcParams.update({"svg.fonttype": "path", "svg.hashsalt": "early-humans-2026", "axes.unicode_minus": False})


def label(fig, x, y, text, size=14, color=INK, **kwargs):
    return fig.text(x, y, text, fontsize=size, color=color, fontproperties=fig._font, **kwargs)


def canvas(title, subtitle, zh):
    fig = plt.figure(figsize=(12, 7.6), dpi=100, facecolor=PAPER)
    fig._font = font_manager.FontProperties(fname=FONT) if zh else font_manager.FontProperties(family="DejaVu Sans")
    label(fig, .055, .935, title, size=23, weight="bold")
    label(fig, .055, .88, subtitle, size=12, color=MUTED)
    return fig


def panel(fig, x, y, width, height, color="white"):
    fig.add_artist(FancyBboxPatch((x,y),width,height,boxstyle="round,pad=0.012,rounding_size=0.014",transform=fig.transFigure,facecolor=color,edgecolor=LINE,linewidth=1.2))


def save(fig, name, zh):
    DESTINATION.mkdir(parents=True,exist_ok=True)
    target=DESTINATION/f"{name}-{'zh' if zh else 'en'}.svg"
    fig.savefig(target,format="svg",facecolor=PAPER,metadata={"Date":None,"Creator":"System Craft Lab"})
    source=re.sub(r'width="[^"]+" height="[^"]+"','width="1200" height="760"',target.read_text(),count=1)
    target.write_text("\n".join(line.rstrip() for line in source.splitlines())+"\n")
    # A raster preview is kept outside the repository for visual inspection.
    preview=Path('/tmp/eng-digest-early-humans')
    preview.mkdir(exist_ok=True)
    fig.savefig(preview/f"{name}-{'zh' if zh else 'en'}.png",dpi=100,facecolor=PAPER)
    plt.close(fig)


def site_map(zh):
    fig=canvas("早期人类遗存的地理位置" if zh else "Locations in the early human record", "现代地理仅供定位；标点为近似位置，没有迁徙箭头" if zh else "Modern geography for orientation; approximate sites without migration arrows", zh)
    ax=fig.add_axes([.07,.19,.86,.62],facecolor="#dbeef2")
    data=json.loads((HERE.parent/'pleistocene/geography.json').read_text())
    for ring in data['land']:ax.add_patch(Polygon(ring,closed=True,facecolor="#e8e0cc",edgecolor="#8b958b",linewidth=.6))
    for river in data['rivers']:
        for line in river['lines']:ax.plot([p[0] for p in line],[p[1] for p in line],color="#408bac",linewidth=1)
    ax.set(xlim=(96,123),ylim=(22,43))
    ax.set_aspect(1.12)
    ax.set_xticks([100,105,110,115,120]);ax.set_yticks([25,30,35,40]);ax.grid(color='white',alpha=.6,linewidth=.6)
    ax.tick_params(labelsize=10)
    sites=[(101.91,25.68,102.5,23.4,"元谋" if zh else "Yuanmou"),(109.49,34.2,100.2,35,"蓝田与上陈" if zh else "Lantian / Shangchen"),(110.29,34.68,115,35.7,"西侯度" if zh else "Xihoudu"),(114.65,40.22,116.4,41,"泥河湾" if zh else "Nihewan"),(110.59,32.83,115.2,30.5,"郧县" if zh else "Yunxian")]
    for x,y,tx,ty,name in sites:
        ax.scatter([x],[y],color=TEAL,s=40,zorder=4,edgecolors='white',linewidth=.8)
        ax.annotate(name,xy=(x,y),xytext=(tx,ty),fontsize=13,fontproperties=fig._font,color=INK,arrowprops={'arrowstyle':'-','color':INK,'lw':.9})
    label(fig,.08,.115,"地点之间的连线不能直接视为古人类的移动路径。" if zh else "These locations do not establish a route between ancient populations.",size=12)
    label(fig,.08,.065,"底图：Natural Earth 陆地与河流，公共领域；没有古地理边界复原。" if zh else "Base: Natural Earth land and rivers, public domain. No ancient boundaries reconstructed.",size=10,color=MUTED)
    save(fig,'site-map',zh)


def yuanmou_context(zh):
    fig=canvas("元谋的牙齿与年代关联" if zh else "Yuanmou teeth and chronological context", "2020 年研究区分测年层位与牙齿的关联" if zh else "The 2020 study distinguishes dated gravels from the tooth association",zh)
    titles=["人体材料","上部砾石","遗址框架"] if zh else ["Human material","Upper gravels","Site chronology"]
    body=["两枚上中门齿\n可比较牙齿形态\n原始确切层位有限制","石英埋藏测年\n约 154 万年\n含外部误差约 ±11 万年","古地磁与层位关联\n约 170 万年\n需要联系具体沉积"] if zh else ["Two upper central incisors\nMorphological comparisons\nExact original layer uncertain","Quartz burial dating\nAbout 1.54 million years\n±0.11 including external error","Paleomagnetism and context\nAbout 1.7 million years\nRequires horizon correlation"]
    for x,title,text in zip([.065,.38,.695],titles,body):
        panel(fig,x,.38,.24,.39)
        label(fig,x+.015,.705,title,size=17,color=TEAL,weight='bold')
        label(fig,x+.015,.63,text,size=11.7 if not zh else 14,va='top',linespacing=2)
    panel(fig,.13,.14,.74,.16,color="#eef4ef")
    label(fig,.15,.245,"测量对象与年代解释需要同时交代" if zh else "Keep the measurement and its context together",size=16,color=TEAL,weight='bold')
    label(fig,.15,.19,"154 万年和 170 万年并非同一层位的两次直接测年。" if zh else "1.54 and 1.7 million years are not two direct dates for the same layer.",size=12)
    label(fig,.065,.065,"概念对照，没有复原实测层厚或原始发现现场。" if zh else "Conceptual comparison, without measured layer thicknesses or a discovery scene.",size=11,color=MUTED)
    save(fig,'yuanmou-context',zh)


def lantian_gap(zh):
    fig=canvas("公王岭的地层关联" if zh else "Stratigraphic relationships at Gongwangling", "概念剖面；厚度、缺失时间长度与位置均不按比例" if zh else "Conceptual section; thicknesses and hiatus duration are not to scale",zh)
    bands=[(.67,.11,"较晚上部沉积" if zh else "Younger upper deposits","#e8d9b8"),(.54,.11,"缺失的地层时间" if zh else "Missing stratigraphic time",PAPER),(.35,.17,"含头骨的层位" if zh else "Fossil horizon","#c8d9ce"),(.17,.16,"下伏砾石" if zh else "Underlying gravels","#d7c2a5")]
    for y,h,t,color in bands:
        fig.add_artist(Rectangle((.08,y),.35,h,transform=fig.transFigure,facecolor=color,edgecolor=INK,linewidth=1,linestyle='--' if y==.54 else '-'))
        label(fig,.255,y+h/2,t,size=14 if zh else 12,ha='center',va='center')
    label(fig,.49,.725,"原来连续沉积的假定需要修正" if zh else "Revise the assumption of continuity",size=16,color=TEAL,weight='bold')
    label(fig,.49,.595,"较老沉积与较新沉积之间有缺口" if zh else "A gap separates surviving deposits",size=13)
    label(fig,.49,.465,"约 163 万年" if zh else "About 1.63 million years",size=17,color=TEAL,weight='bold')
    label(fig,.49,.405,"2015 年化石层位的解释" if zh else "Fossil horizon interpretation, 2015",size=13)
    label(fig,.49,.275,"约 182 ±12 万年" if zh else "About 1.82 ±0.12 million years",size=17,color=OCHRE,weight='bold')
    label(fig,.49,.215,"2017 年下伏砾石的测年" if zh else "Underlying gravel measurement, 2017",size=13)
    label(fig,.08,.075,"下伏砾石的数值不能直接替代头骨层位的年龄。" if zh else "The underlying gravel age cannot replace the fossil horizon age.",size=12,color=MUTED)
    save(fig,'lantian-gap',zh)


def age_records(zh):
    fig=canvas("人体化石与石器记录分开比较" if zh else "Separate fossil and archaeological records", "数字为研究解释与近似年龄，不画祖先后裔连线" if zh else "Reported interpretations and approximate ages, without lines of descent",zh)
    for x,title in [(.065,"人体化石" if zh else "Human fossils"),(.535,"石器记录" if zh else "Stone tool records")]:
        panel(fig,x,.15,.40,.63)
        label(fig,x+.018,.72,title,size=18,color=TEAL,weight='bold')
    left=[("元谋" if zh else "Yuanmou","约 170 万年" if zh else "About 1.7 million years","原始确切层位有限制" if zh else "Exact original tooth layer uncertain"),("公王岭" if zh else "Gongwangling","约 163 万年" if zh else "About 1.63 million years","2015 年层位解释" if zh else "2015 horizon interpretation"),("郧县" if zh else "Yunxian","约 177 ±8 万年" if zh else "About 1.77 ±0.08 million years","2026 年研究；一个标准差内部误差" if zh else "2026 study; 1σ internal error")]
    right=[("上陈" if zh else "Shangchen","最早约 212 万年" if zh else "Earliest about 2.12 million years","没有相应年龄的人体化石" if zh else "No corresponding human fossil"),("马圈沟" if zh else "Majuangou","最低层约 166 万年" if zh else "Lowest layer about 1.66 million years","石器与活动记录" if zh else "Tools and activity evidence"),("西侯度" if zh else "Xihoudu","约 243 ±6 万年" if zh else "About 2.43 ±0.06 million years","2020 年研究；人工性质曾有争议" if zh else "2020 study; manufacture debated")]
    for x,rows in [(.065,left),(.535,right)]:
        for y,(name,age,note) in zip([.63,.45,.27],rows):
            label(fig,x+.018,y,name,size=15,color=INK,weight='bold')
            label(fig,x+.018,y-.052,age,size=13,color=TEAL)
            label(fig,x+.018,y-.10,note,size=10.7,color=MUTED)
    label(fig,.065,.065,"年龄不能脱离测年材料、地层关联和各自误差单独排名。" if zh else "Dates need their samples, stratigraphic relationships, and individual uncertainties.",size=11.5,color=MUTED)
    save(fig,'age-records',zh)


def regional_evidence(zh):
    fig=canvas("从地点到区域历史" if zh else "From local finds to regional history", "并列的是不同信息来源，不是一条人类进化阶梯" if zh else "Complementary information, without an evolutionary ladder",zh)
    titles=["人体形态","人的活动","年代与背景"] if zh else ["Human anatomy","Human activity","Age and context"]
    body=["牙齿、颌骨与头骨\n比较特征和保存状态\n不自动代表直接祖先","石器及加工痕迹\n考察原料、任务与出土背景\n不自动确定制造者物种","层位、沉积与测年样品\n关联材料与时间框架\n不自动补出迁徙路线"] if zh else ["Teeth, jaws, and crania\nTraits and preservation\nNo automatic direct ancestry","Tools and manufacture\nMaterials, tasks, and context\nNo automatic species label","Layers and dating samples\nChronological associations\nNo automatic migration route"]
    for x,t,b in zip([.065,.38,.695],titles,body):
        panel(fig,x,.41,.24,.36)
        label(fig,x+.015,.705,t,size=16,color=TEAL,weight='bold')
        label(fig,x+.015,.63,b,size=11.7 if not zh else 12.7,va='top',linespacing=2)
    panel(fig,.13,.15,.74,.17,color='#eef4ef')
    label(fig,.15,.255,"区域联系还需要跨地点、跨年代的可比证据" if zh else "Regional connections need comparable evidence",size=16,color=TEAL,weight='bold')
    label(fig,.15,.2,"地点相近或年龄相近，都不能单独证明人群延续。" if zh else "Proximity in place or age alone does not establish population continuity.",size=12)
    label(fig,.065,.065,"原创概念图，没有人体复原或已证实的移动线路。" if zh else "Original conceptual illustration, without anatomical reconstructions or proven routes.",size=11,color=MUTED)
    save(fig,'regional-evidence',zh)


if __name__=='__main__':
    for zh in (True,False):
        for draw in (site_map,yuanmou_context,lantian_gap,age_records,regional_evidence):draw(zh)
    print('Rendered ten bilingual illustrations and temporary PNG previews.')
