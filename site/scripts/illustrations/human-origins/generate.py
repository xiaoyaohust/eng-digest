"""Draw original bilingual concept illustrations, without specimen reconstructions.

Run with Python and matplotlib; images are committed source assets, not build output.
"""

from pathlib import Path
import re

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Rectangle

HERE = Path(__file__).resolve().parent
SITE = HERE.parents[2]
DESTINATION = SITE / "public/images/personal/human-origins"
FONT = SITE / "scripts/fonts/NotoSansSC-Regular.ttf"
PAPER, INK, TEAL = "#fcf9f2", "#193341", "#167b82"
MUTED, LINE, OCHRE = "#546773", "#cbc6b9", "#aa713b"
matplotlib.rcParams.update({"svg.fonttype": "path", "svg.hashsalt": "human-origins-2026"})


def label(fig, x, y, text, size=14, color=INK, **kwargs):
    return fig.text(x, y, text, fontsize=size, color=color, fontproperties=fig._font, **kwargs)


def canvas(title, subtitle, zh):
    fig = plt.figure(figsize=(12, 7.6), dpi=100, facecolor=PAPER)
    fig._font = font_manager.FontProperties(fname=FONT) if zh else font_manager.FontProperties(family="DejaVu Sans")
    label(fig, .055, .935, title, size=23, weight="bold")
    label(fig, .055, .88, subtitle, size=12, color=MUTED)
    return fig


def panel(fig, x, y, width, height, face="white", edge=LINE):
    fig.add_artist(FancyBboxPatch((x,y),width,height,boxstyle="round,pad=0.012,rounding_size=0.014",transform=fig.transFigure,facecolor=face,edgecolor=edge,linewidth=1.2))


def box(fig,x,y,width,height,title,body,size=15,color=TEAL):
    panel(fig,x,y,width,height)
    label(fig,x+.02,y+height-.055,title,size=size,color=color,weight="bold")
    label(fig,x+.02,y+height-.11,body,size=13,va="top",linespacing=1.65)


def arrow(fig,start,end,color=TEAL,width=1.6,head=True):
    fig.add_artist(FancyArrowPatch(start,end,transform=fig.transFigure,arrowstyle="-|>" if head else "-",mutation_scale=15,linewidth=width,color=color))


def save(fig,name,zh):
    DESTINATION.mkdir(parents=True,exist_ok=True)
    target=DESTINATION/f"{name}-{'zh' if zh else 'en'}.svg"
    fig.savefig(target,format="svg",facecolor=PAPER,metadata={"Date":None,"Creator":"System Craft Lab"})
    source=re.sub(r'width="[^"]+" height="[^"]+"','width="1200" height="760"',target.read_text(),count=1)
    target.write_text("\n".join(line.rstrip() for line in source.splitlines()) + "\n");plt.close(fig)


def evidence(zh):
    fig=canvas("三类证据，三种观察范围" if zh else "Three kinds of evidence", "证据可以相互检验，信息范围仍需分别说明" if zh else "Complementary comparisons with different scopes",zh)
    titles=["骨骼形态","古 DNA","古蛋白"] if zh else ["Morphology","Ancient DNA","Ancient proteins"]
    bodies=["身体结构与发育\n形态特征的组合\n个体差异与保存状态","保留下来的遗传片段\n母系或更广的亲缘信息\n真实性与覆盖范围","保留下来的氨基酸序列\n有区分力的序列差异\n不等于完整基因组"] if zh else ["Body structure and growth\nCombinations of traits\nVariation and preservation","Surviving genetic fragments\nMaternal or nuclear evidence\nAuthenticity and coverage","Surviving protein sequences\nInformative differences\nNot a complete genome"]
    for x,t,b in zip([.065,.38,.695],titles,bodies):box(fig,x,.40,.24,.37,t,b)
    box(fig,.12,.13,.76,.18,"共同依据" if zh else "Shared foundations","材料的年代、地点、出土关系与取样记录。" if zh else "Specimen age, location, archaeological context, and sampling records.",size=16)
    label(fig,.065,.055,"概念示意，没有绘制具体化石或复原容貌。" if zh else "Conceptual comparison without a specimen drawing or reconstructed face.",size=11,color=MUTED)
    save(fig,"evidence-types",zh)


def authentication(zh):
    fig=canvas("先判断分子来自哪里" if zh else "Establish molecular origin first", "来源与真实性要结合多项检查判断" if zh else "Origin and authenticity require several checks together",zh)
    box(fig,.08,.58,.34,.20,"样本自身保留的分子" if zh else "Endogenous molecules","保存与损伤程度不一" if zh else "Variable preservation and damage",size=15)
    box(fig,.58,.58,.34,.20,"后来混入的分子" if zh else "Later contamination","发掘、保存与实验环节" if zh else "Excavation, curation, and laboratory",size=15,color=OCHRE)
    arrow(fig,(.25,.57),(.42,.48));arrow(fig,(.75,.57),(.58,.48),color=OCHRE)
    panel(fig,.35,.36,.30,.13)
    for x,y,length,c in [(.38,.445,.07,TEAL),(.49,.445,.10,OCHRE),(.405,.40,.11,OCHRE),(.55,.40,.055,TEAL)]:
        fig.add_artist(Rectangle((x,y),length,.008,transform=fig.transFigure,color=c))
    titles=["实验对照","分子与污染检查","独立信息量"] if zh else ["Controls","Molecules and mixtures","Independent information"]
    bodies=["洁净流程与空白样本\n检查外来来源","长度、损伤与污染估计\n结合处理方式解释","区分重复读段\n检查覆盖与错误"] if zh else ["Clean handling and blanks\nInvestigate outside sources","Lengths and damage\nContamination; lab effects","Distinguish duplicate reads\nAssess coverage and error"]
    for x,t,b in zip([.065,.38,.695],titles,bodies):box(fig,x,.12,.24,.19,t,b,size=13 if not zh else 15)
    label(fig,.065,.045,"片段和颜色仅作示意，不表示测量结果或通用阈值。" if zh else "Fragments and colors are illustrative, without measured values or universal thresholds.",size=10.5,color=MUTED)
    save(fig,"authentication",zh)


def inheritance(zh):
    fig=canvas("一条母系路径与双亲来源" if zh else "One maternal path and two parental sources", "家系为教学假设；颜色不表示祖先比例" if zh else "A hypothetical pedigree; colors do not encode ancestry percentages",zh)
    grandparents=[(.11,.70),(.285,.70),(.46,.70),(.635,.70)]
    mother,father,child=(.1975,.46),(.5475,.46),(.3725,.23)
    for start,end in [(grandparents[0],mother),(grandparents[1],mother),(grandparents[2],father),(grandparents[3],father),(mother,child),(father,child)]:arrow(fig,start,end,color="#a7aaa4",width=1.4,head=False)
    arrow(fig,grandparents[0],mother,color=TEAL,width=3.2,head=False);arrow(fig,mother,child,color=TEAL,width=3.2,head=False)
    labels=["母亲的母亲","母亲的父亲","父亲的母亲","父亲的父亲"] if zh else ["Mother's mother","Mother's father","Father's mother","Father's father"]
    for (x,y),t in zip(grandparents,labels):
        fig.add_artist(Circle((x,y),.019,transform=fig.transFigure,facecolor="white",edgecolor=TEAL if x==.11 else MUTED,linewidth=2))
        label(fig,x,y+.055,t,size=10.5,ha="center")
    for (x,y),t in [(mother,"母亲" if zh else "Mother"),(father,"父亲" if zh else "Father"),(child,"个体" if zh else "Individual")]:
        fig.add_artist(Circle((x,y),.022,transform=fig.transFigure,facecolor="white",edgecolor=TEAL if x!=father[0] else MUTED,linewidth=2))
        label(fig,x,y-.065,t,size=13,ha="center")
    panel(fig,.735,.28,.20,.49)
    label(fig,.755,.71,"核 DNA" if zh else "Nuclear DNA",size=16,color=TEAL,weight="bold")
    label(fig,.755,.645,"来自双亲" if zh else "From both parents",size=12)
    for y,c,t in [(.54,TEAL,"母方" if zh else "Maternal"),(.43,OCHRE,"父方" if zh else "Paternal")]:
        fig.add_artist(Rectangle((.755,y),.10,.025,transform=fig.transFigure,color=c))
        label(fig,.755,y-.04,t,size=11,color=c)
    label(fig,.065,.065,"突出颜色标出母系路径；核 DNA 示意不模拟重组或片段长度。" if zh else "The highlighted line traces maternal descent. Nuclear symbols do not model recombination.",size=11,color=MUTED)
    save(fig,"inheritance",zh)


def denisova_family(zh):
    fig=canvas("丹尼索瓦 11 号的双亲关系" if zh else "Parentage inferred for Denisova 11", "依据 Slon 等人 2018 年发表的研究" if zh else "Based on the study published by Slon and colleagues in 2018",zh)
    box(fig,.10,.56,.30,.22,"母亲" if zh else "Mother","尼安德特人" if zh else "Neanderthal",size=18)
    box(fig,.60,.56,.30,.22,"父亲" if zh else "Father","丹尼索瓦人" if zh else "Denisovan",size=18,color=OCHRE)
    arrow(fig,(.25,.55),(.45,.40));arrow(fig,(.75,.55),(.55,.40),color=OCHRE)
    box(fig,.33,.18,.34,.22,"丹尼索瓦 11 号" if zh else "Denisova 11","支持直接双亲关系的个体" if zh else "Individual with inferred direct parentage",size=18)
    label(fig,.07,.07,"这项证据不能单独确定其他地区的接触频率或人群混合比例。" if zh else "This individual does not determine contact rates or mixture proportions elsewhere.",size=11.5,color=MUTED)
    save(fig,"denisova-family",zh)


def molecular_cases(zh):
    fig=canvas("夏河与哈尔滨的证据范围" if zh else "Evidence from Xiahe and Harbin", "材料与年代限定需要随亲缘结论一起保留" if zh else "Keep material and age constraints with the relationship inference",zh)
    columns=[(.08,"夏河下颌骨" if zh else "Xiahe mandible","2019"),(.56,"哈尔滨头骨" if zh else "Harbin cranium","2025")]
    for x,t,year in columns:
        panel(fig,x,.24,.36,.53)
        label(fig,x+.02,.71,t,size=18,color=TEAL,weight="bold")
        label(fig,x+.02,.66,year,size=11,color=MUTED)
    for x,body in [(.08,"古蛋白序列\n至少约 16 万年\n与丹尼索瓦人的联系" if zh else "Ancient protein sequences\nAt least about 160,000 years\nDenisovan affinity"),(.56,"古蛋白与线粒体 DNA\n至少约 14.6 万年\n与丹尼索瓦人的联系" if zh else "Proteins and mitochondrial DNA\nAt least about 146,000 years\nDenisovan affinity")]:label(fig,x+.02,.57,body,size=14,va="top",linespacing=2.1)
    label(fig,.08,.13,"上述结果不等于两件标本的完整核基因组。" if zh else "These results do not constitute complete nuclear genomes from either specimen.",size=12)
    label(fig,.08,.07,"此图比较具体标本，不将整个洞穴的其他材料合并成同一份分子样本。" if zh else "The comparison concerns the named specimens, not every sample from their sites.",size=10.5,color=MUTED)
    save(fig,"molecular-cases",zh)


def claim_scope(zh):
    fig=canvas("不同问题需要不同证据" if zh else "Different questions need different evidence", "三行表示不同问题，没有自动推导的箭头" if zh else "Separate questions, without arrows implying automatic deductions",zh)
    left=["个体亲缘","区域人群历史","语言与文化身份"] if zh else ["Individual affinity","Regional population history","Language and cultural identity"]
    right=["经过核查的分子或形态证据\n适当的参照与比较方法","跨地点、跨年代的样本\n出土背景与年代框架","符合该问题的考古或文献材料\n不能仅由亲缘关系直接指定"] if zh else ["Authenticated molecules or morphological evidence\nSuitable references and comparisons","Samples across places and periods\nArchaeological context and chronology","Archaeological or written evidence for the question\nAffinity alone cannot assign an identity"]
    for y,t,b in zip([.60,.38,.16],left,right):
        panel(fig,.065,y,.87,.16)
        label(fig,.085,y+.095,t,size=13 if not zh else 16,color=TEAL,weight="bold")
        label(fig,.39,y+.105,b,size=12.5,va="top",linespacing=1.65)
    label(fig,.065,.055,"一件标本不代表整个地区；一类分子信息也不等于全部历史。" if zh else "One specimen does not represent a whole region or answer every historical question.",size=11,color=MUTED)
    save(fig,"claim-scope",zh)


if __name__ == "__main__":
    for chinese in (False,True):
        for draw in (evidence,authentication,inheritance,denisova_family,molecular_cases,claim_scope):draw(chinese)
    print("Rendered twelve bilingual concept illustrations.")
