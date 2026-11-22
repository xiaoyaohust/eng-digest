"""Render bilingual diagrams for the Zhoukoudian history essay."""
from pathlib import Path
import re

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Polygon, Rectangle

HERE = Path(__file__).resolve().parent
SITE = HERE.parents[2]
DESTINATION = SITE / "public/images/personal/zhoukoudian"
FONT = SITE / "scripts/fonts/NotoSansSC-Regular.ttf"
PAPER, INK, TEAL, MUTED, LINE, OCHRE = "#fcf9f2", "#193341", "#167b82", "#546773", "#cbc6b9", "#aa713b"
matplotlib.rcParams.update({"svg.fonttype": "path", "svg.hashsalt": "zhoukoudian-2026", "axes.unicode_minus": False})


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
    preview=Path('/tmp/eng-digest-zhoukoudian')
    preview.mkdir(exist_ok=True)
    fig.savefig(preview/f"{name}-{'zh' if zh else 'en'}.png",dpi=100,facecolor=PAPER)
    plt.close(fig)


def arrow(fig, start, end, color=TEAL):
    fig.add_artist(FancyArrowPatch(start,end,transform=fig.transFigure,arrowstyle='-|>',mutation_scale=15,linewidth=1.5,color=color))


def setting(zh):
    fig=canvas("周口店的位置与研究范围" if zh else "Zhoukoudian in place and time", "现代近似坐标用于定位；右侧不是遗址平面布局" if zh else "Approximate modern positions; the right panel is not a site plan",zh)
    ax=fig.add_axes([.085,.23,.39,.52],facecolor='#eef4ef')
    ax.set(xlim=(115.7,116.65),ylim=(39.45,40.12))
    ax.set_xticks([115.8,116.1,116.4]);ax.set_yticks([39.6,39.8,40.0]);ax.grid(color=LINE,alpha=.6)
    ax.tick_params(labelsize=10)
    ax.scatter([115.925,116.4],[39.69,39.9],s=65,color=[TEAL,OCHRE],edgecolors='white',zorder=3)
    for x,y,name in [(115.925,39.69,"周口店" if zh else "Zhoukoudian"),(116.4,39.9,"北京城区" if zh else "Central Beijing")]:
        ax.text(x,y+.055,name,fontproperties=fig._font,fontsize=12,ha='center',color=INK)
    for y,title,body in [(.59,"第一地点" if zh else "Locality 1","本篇核心：北京人与洞穴记录" if zh else "Focus: Peking Man and the cave record"),(.39,"山顶洞" if zh else "Upper Cave","较晚的现代人材料" if zh else "Later modern human material"),(.19,"其他地点" if zh else "Other localities","各自有不同堆积与年代" if zh else "Distinct deposits and chronologies")]:
        panel(fig,.55,y,.37,.16)
        label(fig,.57,y+.10,title,size=17,color=TEAL,weight='bold')
        label(fig,.57,y+.045,body,size=11.5)
    label(fig,.085,.11,"左图坐标：东经与北纬，单位为度；没有古地形复原。" if zh else "Left: longitude east and latitude north in degrees. No ancient terrain reconstructed.",size=11.5,color=MUTED)
    label(fig,.085,.06,"同一遗址群中的材料不必属于同一时期。" if zh else "A shared site complex does not establish that its finds are contemporary.",size=11.5,color=MUTED)
    save(fig,'setting',zh)


def research_history(zh):
    fig=canvas("从牙齿到系列头盖骨" if zh else "From teeth to a series of skullcaps", "下列年份属于近代发现史，不是古人类生活的年代" if zh else "Years identify discoveries and research, not ancient human lifetimes",zh)
    xs=[.085,.315,.545,.775]
    fig.add_artist(Rectangle((.085,.59),.79,.006,transform=fig.transFigure,color=TEAL))
    years=['1921 / 1923','1927','1929','1936']
    titles=["早期发掘","命名与比较","较完整头盖骨","三件头盖骨"] if zh else ["Early excavation","Naming","A skullcap","Three skullcaps"]
    people=["师丹斯基等","步达生","裴文中","贾兰坡"] if zh else ["Zdansky and team","Davidson Black","Pei Wenzhong","Jia Lanpo"]
    for x,year,title,person in zip(xs,years,titles,people):
        label(fig,x,.73,year,size=17,color=TEAL,weight='bold')
        label(fig,x,.66,title,size=14)
        label(fig,x,.52,person,size=13)
    panel(fig,.085,.18,.37,.23)
    panel(fig,.545,.18,.37,.23)
    label(fig,.105,.34,"野外与修理" if zh else "Fieldwork and preparation",size=16,color=TEAL,weight='bold')
    label(fig,.105,.27,"发掘、清理、编号与层位记录" if zh else "Excavation, cleaning, labels, and context",size=12)
    label(fig,.565,.34,"比较研究" if zh else "Comparative research",size=16,color=TEAL,weight='bold')
    label(fig,.565,.27,"步达生、魏敦瑞及合作者" if zh else "Black, Weidenreich, and collaborators",size=12)
    label(fig,.085,.075,"工作关系不等于古人类亲缘关系；未复原发掘现场。" if zh else "Work connections are not ancient family relationships. No excavation scene reconstructed.",size=11,color=MUTED)
    save(fig,'research-history',zh)


def cave_processes(zh):
    fig=canvas("洞穴记录的多种形成过程" if zh else "Several processes shape a cave record", "概念示意，不是周口店第一地点的实测剖面" if zh else "Conceptual illustration, not a measured section of Locality 1",zh)
    # The roof outline and deposits are hypothetical teaching shapes.
    roof=[(.08,.26),(.08,.66),(.19,.79),(.39,.79),(.45,.73),(.59,.72),(.67,.79),(.91,.69),(.91,.26),(.84,.26),(.84,.62),(.66,.70),(.57,.64),(.44,.65),(.35,.71),(.22,.71),(.15,.63),(.15,.26)]
    fig.add_artist(Polygon(roof,transform=fig.transFigure,closed=True,facecolor='#d9c9ad',edgecolor=INK,linewidth=1.2))
    for i,(c,h) in enumerate([('#e3dcc8',.06),('#cdd9ce',.06),('#dcc2a0',.06)]):
        fig.add_artist(Rectangle((.15,.26+i*.06),.69,h,transform=fig.transFigure,facecolor=c,edgecolor=LINE,linewidth=.7))
    label(fig,.18,.55,"人的活动" if zh else "Human activity",size=14,color=TEAL)
    label(fig,.50,.55,"动物带入骨骼" if zh else "Carnivore transport",size=14,color=OCHRE)
    arrow(fig,(.27,.51),(.30,.45));arrow(fig,(.62,.51),(.60,.45),OCHRE)
    label(fig,.07,.195,"流水搬运" if zh else "Water transport",size=13,color=TEAL)
    arrow(fig,(.11,.24),(.24,.32))
    label(fig,.55,.805,"顶壁坍塌" if zh else "Roof collapse",size=13)
    arrow(fig,(.56,.745),(.52,.57),MUTED)
    for x,y in [(.49,.62),(.53,.58),(.56,.61)]:
        fig.add_artist(Polygon([(x,y),(x+.015,y+.017),(x+.026,y-.005),(x+.006,y-.013)],transform=fig.transFigure,facecolor='#c0b69c',edgecolor=MUTED,linewidth=.7))
    label(fig,.46,.175,"多次事件形成的积累" if zh else "Accumulation across events",size=14,color=TEAL,ha='center')
    label(fig,.08,.07,"颜色只区分示意层，不对应实际层号或年代；箭头不表示已知先后顺序。" if zh else "Colors do not encode real layers or ages. Arrows do not establish an event sequence.",size=11,color=MUTED)
    save(fig,'cave-processes',zh)


def fire_evidence(zh):
    fig=canvas("用火证据需要对应层位" if zh else "Fire evidence needs its own layer context", "发表年份不是燃烧事件发生的年代" if zh else "Publication years are not the dates of ancient fires",zh)
    titles=["1998 年研究","2017 年研究","2022 年研究"] if zh else ["1998 study","2017 study","2022 study"]
    bodies=["第 10 层\n有受热骨骼\n原位燃烧缺少直接证据","第 4 层新发掘\n提出原地用火证据\n下部层位仍需检验","第 4 / 5 层取样\n骨骼矿物与受热分析\n补充第 4 层用火解释"] if zh else ["Layer 10\nBurned bones present\nDirect in situ evidence lacking","New Layer 4 excavation\nEvidence for fire use in place\nLower layers need further testing","Samples from Layers 4 / 5\nMineral and heating analysis\nSupports Layer 4 interpretation"]
    for x,t,b in zip([.065,.38,.695],titles,bodies):
        panel(fig,x,.38,.24,.39)
        label(fig,x+.015,.70,t,size=17,color=TEAL,weight='bold')
        label(fig,x+.015,.63,b,size=11.2 if not zh else 13.5,va='top',linespacing=2)
    panel(fig,.13,.14,.74,.16,color='#eef4ef')
    label(fig,.15,.245,"区分受热、原位燃烧与人的行为" if zh else "Distinguish heating, location, and human action",size=16,color=TEAL,weight='bold')
    label(fig,.15,.19,"不同层位、不同样品不能合并为一个最早年龄。" if zh else "Different layers and samples cannot be assigned a single earliest age.",size=12)
    label(fig,.065,.065,"概念对照，不提供统一判别温度或实际燃烧测量曲线。" if zh else "Conceptual comparison without a universal temperature threshold or synthetic measurements.",size=10.5,color=MUTED)
    save(fig,'fire-evidence',zh)


def materials_methods(zh):
    fig=canvas("保存的材料决定能够观察什么" if zh else "Surviving material determines observations", "模型、原物与分子样本提供不同信息" if zh else "Casts, originals, and molecular samples provide different information",zh)
    rows=[("模型与档案","外部形态、照片、测量与研究史\n没有保存原骨全部内部结构或分子") ,("保存原物","可以观察外形与部分内部结构\n成像和取样仍取决于保存状态"),("牙釉质蛋白","2026 年研究：部分蛋白序列\n不等于完整古基因组或个体族谱")] if zh else [("Casts and archives","External form, photos, measurements, and history\nNot every original internal structure or molecule"),("Surviving originals","External and some internal anatomy\nImaging and sampling depend on preservation"),("Enamel proteins","2026 study: partial protein sequences\nNot complete ancient genomes or pedigrees")]
    for y,(title,body) in zip([.60,.38,.16],rows):
        panel(fig,.065,y,.87,.16)
        label(fig,.085,y+.095,title,size=16 if zh else 14,color=TEAL,weight='bold')
        label(fig,.37,y+.105,body,size=12.2,va='top',linespacing=1.65)
    label(fig,.065,.055,"原创信息对照，没有描绘实际头骨、蛋白序列或家系。" if zh else "Original comparison without a specimen reconstruction, protein sequence, or family tree.",size=11,color=MUTED)
    save(fig,'materials-and-methods',zh)


if __name__=='__main__':
    for zh in (True,False):
        for draw in (setting,research_history,cave_processes,fire_evidence,materials_methods):draw(zh)
    print('Rendered ten bilingual illustrations and temporary PNG previews.')
