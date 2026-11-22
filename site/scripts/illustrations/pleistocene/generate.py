"""Render the article's bilingual illustrations from local, attributed inputs.

Run with Python and matplotlib. No network or site build dependency is needed.
"""

import csv
import json
from pathlib import Path
import re

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Ellipse, FancyArrowPatch, FancyBboxPatch, Polygon


HERE = Path(__file__).resolve().parent
SITE = HERE.parents[2]
DESTINATION = SITE / "public/images/personal/pleistocene"
FONT = SITE / "scripts/fonts/NotoSansSC-Regular.ttf"
PAPER, INK, TEAL = "#fcf9f2", "#193341", "#167b82"
MUTED, LINE, WATER, LAND = "#546773", "#cbc6b9", "#dbeef2", "#e8e0cc"
matplotlib.rcParams.update({"svg.fonttype": "path", "svg.hashsalt": "pleistocene-2026", "axes.unicode_minus": False})


def canvas(title, subtitle, zh=False, height=760):
    fig = plt.figure(figsize=(12, height / 100), dpi=100, facecolor=PAPER)
    fig._article_font = font_manager.FontProperties(fname=FONT) if zh else font_manager.FontProperties(family="DejaVu Sans")
    fig._article_height = height
    label(fig, .055, .935, title, size=23, weight="bold")
    label(fig, .055, .885, subtitle, size=12, color=MUTED)
    return fig


def label(fig, x, y, text, size=14, color=INK, weight="normal", **kwargs):
    return fig.text(x, y, text, fontsize=size, color=color, fontproperties=fig._article_font, weight=weight, **kwargs)


def box(fig, x, y, width, height, title, body, color=TEAL, title_size=17):
    fig.add_artist(FancyBboxPatch((x, y), width, height, boxstyle="round,pad=0.012,rounding_size=0.014", transform=fig.transFigure, facecolor="white", edgecolor=LINE, linewidth=1.2))
    label(fig, x+.018, y+height-.055, title, size=title_size, color=color, weight="bold")
    label(fig, x+.018, y+height-.107, body, size=13, va="top", linespacing=1.65)


def arrow(fig, start, end, color=TEAL, style="-|>", curve=0):
    fig.add_artist(FancyArrowPatch(start, end, transform=fig.transFigure, arrowstyle=style, mutation_scale=16, linewidth=1.6, color=color, connectionstyle=f"arc3,rad={curve}"))


def save(fig, name, zh=False):
    DESTINATION.mkdir(parents=True, exist_ok=True)
    target = DESTINATION / f"{name}-{'zh' if zh else 'en'}.svg"
    fig.savefig(target, format="svg", facecolor=PAPER, metadata={"Date": None, "Creator": "System Craft Lab"})
    source = target.read_text()
    source = re.sub(r'width="[^"]+" height="[^"]+"', f'width="1200" height="{fig._article_height}"', source, count=1)
    target.write_text(source)
    plt.close(fig)


def geography(zh):
    fig = canvas("东亚的地理背景" if zh else "East Asia's geographical setting", "现代海岸仅供定位；色块标示大致区域" if zh else "Modern coasts for orientation; shading locates broad regions", zh, 850)
    ax = fig.add_axes([.06, .18, .88, .65], facecolor=WATER)
    data = json.loads((HERE / "geography.json").read_text())
    for ring in data["land"]:
        ax.add_patch(Polygon(ring, closed=True, facecolor=LAND, edgecolor="#8b958b", linewidth=.65))
    ax.add_patch(Ellipse((90.5, 32.7), 25, 12, facecolor="#b18a68", alpha=.36, edgecolor="none"))
    ax.add_patch(Ellipse((108.5, 36), 12, 6, facecolor="#d7b04e", alpha=.52, edgecolor="none"))
    for river in data["rivers"]:
        for line in river["lines"]:
            ax.plot([p[0] for p in line], [p[1] for p in line], color="#408bac", linewidth=1.15)
    ax.set(xlim=(75,145), ylim=(10,55))
    ax.set_aspect(1.2)
    ax.set_xticks([80,95,110,125,140]); ax.set_yticks([15,25,35,45,55])
    ax.grid(color="white", alpha=.55, linewidth=.6)
    ax.tick_params(labelsize=10, color=LINE)
    for spine in ax.spines.values(): spine.set_edgecolor(LINE)
    text = lambda x,y,s,**kw: ax.text(x,y,s,fontproperties=fig._article_font,fontsize=12,color=INK,**kw)
    text(88,31,"青藏高原" if zh else "Tibetan\nPlateau",ha="center")
    text(106,35.4,"黄土地区" if zh else "Loess\nregion",ha="center")
    text(95,47,"大陆内陆" if zh else "Continental interior",ha="center")
    ax.scatter([114.65],[40.22],s=34,color="#be6d40",zorder=5)
    ax.annotate("泥河湾" if zh else "Nihewan", xy=(114.65,40.22),xytext=(118,46),fontsize=12,color=INK,fontproperties=fig._article_font,arrowprops={"arrowstyle":"-","color":INK,"lw":.8})
    text(112.5,37.7,"黄河" if zh else "Yellow River")
    text(109,27.5,"长江" if zh else "Yangtze")
    text(125.5,36,"黄海" if zh else "Yellow Sea",ha="center")
    text(128.5,28,"东海" if zh else "East China Sea",ha="center")
    text(138,18,"西太平洋" if zh else "Western Pacific",ha="center")
    text(138.5,39.2,"日本列岛" if zh else "Japanese\narchipelago",ha="center")
    text(123.5,22,"台湾" if zh else "Taiwan")
    label(fig,.065,.105,"没有古冰川边界或迁徙路线。" if zh else "No ancient glacier boundaries or migration routes are mapped.",size=12)
    label(fig,.065,.063,"底图：Natural Earth 陆地与河流资料，公共领域。" if zh else "Base: Natural Earth land and river data, public domain.",size=10,color=MUTED)
    save(fig,"geography",zh)


def feedbacks(zh):
    fig=canvas("从季节日照到环境变化" if zh else "From seasonal sunlight to environmental change", "机制示意；各箭头没有统一的强度或时间尺度" if zh else "Conceptual links; arrows do not share a single strength or timescale",zh)
    titles=["轨道与季节日照","积雪能否度过夏天","陆地冰量"] if zh else ["Orbit and sunlight","Summer snow survival","Land ice volume"]
    bodies=["不同纬度、不同季节\n获得的日照发生变化","多年融雪与积累的差额\n影响冰体增长或退缩","水在陆地与海洋间转移\n使全球平均海平面变化"] if zh else ["Sunlight changes by\nlatitude and season.","Accumulation and melting\nshape growth and retreat.","Water moves between\nland storage and ocean."]
    for x,title,body in zip([.065,.38,.695],titles,bodies):box(fig,x,.52,.24,.26,title,body,title_size=15 if not zh else 17)
    arrow(fig,(.31,.65),(.37,.65));arrow(fig,(.625,.65),(.685,.65))
    box(fig,.12,.18,.38,.21,"反馈" if zh else "Feedbacks","反照率、温室气体与海洋过程\n共同改变气候响应" if zh else "Reflectivity, greenhouse gases,\nand ocean processes alter the response.")
    box(fig,.58,.18,.34,.21,"东亚的地方条件" if zh else "Local East Asian conditions","季风与水源、海岸与植被\n还受地形和区域过程影响" if zh else "Monsoons, water, coasts,\nand vegetation also reflect\nregional geography.",title_size=15 if not zh else 17)
    arrow(fig,(.31,.4),(.49,.51));arrow(fig,(.61,.51),(.48,.4));arrow(fig,(.815,.51),(.75,.4))
    label(fig,.065,.07,"每次冰期都需要结合具体记录解释。" if zh else "Each glacial cycle still requires interpretation against its own records.",size=12,color=MUTED)
    save(fig,"feedbacks",zh)


def sea_level(zh):
    fig=canvas("过去十五万年的全球海平面" if zh else "Global sea level over the past 150,000 years", "保留原始重建数值与作者的自助抽样 95% 区间" if zh else "Original reconstructed values and the authors' bootstrap 95% interval",zh)
    with (HERE/"sea-level.csv").open() as source:rows=list(csv.DictReader(source))
    age=[float(r["age_calkaBP"]) for r in rows];level=[float(r["SeaLev_shortPC1"]) for r in rows]
    low=[float(r["SeaLev_shortPC1_err_lo"]) for r in rows];high=[float(r["SeaLev_shortPC1_err_up"]) for r in rows]
    ax=fig.add_axes([.115,.255,.82,.55],facecolor="white")
    ax.axvspan(19,26.5,color="#ead5a2",alpha=.55,zorder=0)
    ax.fill_between(age,low,high,color="#9bc6cc",alpha=.6,linewidth=0)
    ax.plot(age,level,color=TEAL,linewidth=1.9)
    ax.axhline(0,color=MUTED,lw=.8,ls=":")
    ax.set_xlim(150,0);ax.set_ylim(-150,30);ax.set_xticks([150,125,100,75,50,25,0]);ax.set_yticks([-140,-100,-60,-20,20])
    ax.set_xlabel("距 1950 年的千年数（ka BP）" if zh else "Thousands of calendar years before 1950 CE (ka BP)",fontproperties=fig._article_font,fontsize=12,labelpad=10)
    ax.set_ylabel("相对于现今海面的高度（米）" if zh else "Meters relative to present sea level",fontproperties=fig._article_font,fontsize=12,labelpad=10)
    ax.grid(alpha=.22);ax.tick_params(labelsize=11)
    for spine in ax.spines.values():spine.set_color(LINE)
    ax.text(22.75,23,"末次冰盛期" if zh else "LGM",ha="center",va="top",fontproperties=fig._article_font,fontsize=11,color=INK)
    label(fig,.115,.13,"阴影不包含所有年代和区域误差；端点并非现代实测值。" if zh else "The interval does not include all age or regional errors. The endpoint is not a modern observation.",size=10.5,color=MUTED)
    label(fig,.115,.075,"来源：Spratt 与 Lisiecki（2016），NOAA 数据存档；访问于 2026 年 11 月 22 日。" if zh else "Source: Spratt and Lisiecki (2016), NOAA archive. Accessed November 22, 2026.",size=10.5,color=MUTED)
    save(fig,"sea-level",zh)


def shelf(zh):
    fig=canvas("同一条陆架上的两种海面" if zh else "Two sea levels over the same shelf", "假设剖面；没有测量比例，也不对应真实海峡" if zh else "Hypothetical profile without survey scales or a real strait",zh)
    xs=[0,1,2,3,4,5,6,7,8,9,10];ground=[1.8,1.2,.8,.45,.15,-.1,-.35,-.55,-.9,-1.7,-2.5]
    for pos,water,title in [([.07,.51,.86,.27],-.7,"较低海面" if zh else "Lower sea level"),([.07,.15,.86,.27],.3,"较高海面" if zh else "Higher sea level")]:
        ax=fig.add_axes(pos,facecolor="white")
        ax.fill_between(xs,ground,-3,color=LAND)
        ax.fill_between(xs,ground,water,where=[g<water for g in ground],interpolate=True,color=WATER)
        ax.plot(xs,ground,color="#9b8060",lw=2);ax.axhline(water,color="#438ca1",lw=1.6)
        ax.set(xlim=(0,10),ylim=(-2.9,2.1));ax.set_xticks([]);ax.set_yticks([])
        for spine in ax.spines.values():spine.set_color(LINE)
        label(fig,.075,pos[1]+pos[3]+.025,title,size=15)
        ax.text(9.7,water+.14,"海面" if zh else "Sea surface",ha="right",fontproperties=fig._article_font,fontsize=11,color=TEAL)
        if water<0:
            ax.annotate("露出的陆架" if zh else "Exposed shelf",xy=(5,-.1),xytext=(4.4,1.15),fontproperties=fig._article_font,fontsize=13,ha="center",color=INK,arrowprops={"arrowstyle":"->","color":INK})
        else:
            ax.annotate("旧地表被淹没" if zh else "Former ground submerged",xy=(6,-.35),xytext=(6.2,-2.2),fontproperties=fig._article_font,fontsize=13,ha="center",color=INK,arrowprops={"arrowstyle":"->","color":INK})
    label(fig,.07,.06,"这是岸线移动的机制说明，没有画出迁徙路线。" if zh else "This illustrates shoreline movement without identifying a migration route.",size=12,color=MUTED)
    save(fig,"shelf",zh)


def responses(zh):
    fig=canvas("环境条件怎样影响人的选择" if zh else "Environmental conditions and human choices", "可以提出机制，但实际行为需要遗存支持" if zh else "Mechanisms suggest possibilities; remains establish actual behavior",zh)
    x=[.065,.38,.695]
    titles=["区域变化","地方生活条件","可能的反应"] if zh else ["Regional change","Local living conditions","Possible responses"]
    bodies=["温度、季风与海面\n变化的速度和时段","可用水源与季节食物\n地形、距离和风险","调整到访季节或驻地\n改变食物或移动范围"] if zh else ["Temperature, monsoons,\nand sea level change\nat different rates.","Water, seasonal food,\nterrain, distance,\nand risk.","Different visiting seasons,\ncamps, foods, or\nareas of movement."]
    for left,title,body in zip(x,titles,bodies):box(fig,left,.47,.24,.30,title,body,title_size=14 if not zh else 17)
    arrow(fig,(.31,.62),(.37,.62));arrow(fig,(.625,.62),(.685,.62))
    box(fig,.13,.15,.74,.20,"检验实际行为的证据" if zh else "Evidence for what people did","遗址年代、食物与工具遗存、驻留方式，以及调查和保存条件。" if zh else "Site chronology, food and tools, occupation patterns, and survey and preservation conditions.",title_size=17)
    arrow(fig,(.815,.46),(.79,.36),color="#a66f37",style="<->")
    label(fig,.065,.065,"环境适宜区不能单独证明人群来源、去向或连续居住。" if zh else "Suitable habitat alone cannot establish origins, destinations, or continuous occupation.",size=11.5,color=MUTED)
    save(fig,"human-responses",zh)


if __name__ == "__main__":
    for chinese in (False, True):
        for render in (geography, feedbacks, sea_level, shelf, responses):render(chinese)
    print("Rendered ten bilingual illustrations.")
