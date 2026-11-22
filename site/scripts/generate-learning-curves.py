"""Regenerate the article's committed scientific illustrations from its example.

Requires NumPy and Matplotlib. Run from any directory:
  python site/scripts/generate-learning-curves.py --cjk-font /path/to/cjk-font.ttf

The font must include Simplified Chinese glyphs. macOS font paths are detected
when present; elsewhere supply a local Noto Sans CJK or equivalent font.
This is an editorial utility, not part of the website build or browser runtime.
"""

import argparse
from pathlib import Path
import re

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
ARTICLE = ROOT / "site/src/content/ai/reading-learning-curves-and-analyzing-failure-cases.md"
OUTPUT = ROOT / "site/public/images/ai/learning-curves"
PREVIEW = ROOT / "site/test-results/learning-curves"
TRAIN, VALID, INK = "#087f8c", "#c65d21", "#18283c"


def save_figure(fig, name, language, title):
    metadata = {"Date": None, "Title": title,
                "Description": "Computed synthetic teaching fixture; no production measurements.",
                "Creator": "System Craft Lab; Matplotlib"}
    svg_path = OUTPUT / f"{name}-{language}.svg"
    fig.savefig(svg_path, metadata=metadata)
    # Matplotlib's path formatter adds trailing blanks to many SVG lines.
    svg_path.write_text("\n".join(line.rstrip() for line in svg_path.read_text().splitlines()) + "\n")
    fig.savefig(PREVIEW / f"{name}-{language}.png", dpi=150)
    plt.close(fig)


def draw_figures(result, language, family):
    chinese = language == "zh"
    plt.rcParams.update({"font.family": family, "font.size": 12,
                         "axes.titlesize": 18, "axes.labelsize": 13,
                         "axes.labelcolor": INK, "text.color": INK,
                         "xtick.color": INK, "ytick.color": INK,
                         "axes.edgecolor": "#a6b3c3", "axes.grid": True,
                         "grid.color": "#dce4ed", "grid.alpha": 0.8,
                         "svg.fonttype": "path", "svg.hashsalt": "scl-learning-curves-v1",
                         "figure.facecolor": "white", "axes.facecolor": "white"})
    train_label, valid_label = ("训练", "验证") if chinese else ("Training", "Validation")
    ylabel = "MSE（分钟²）" if chinese else "Mean squared error (minutes²)"
    footer = "合成数据的计算结果，不代表生产测量" if chinese else "Computed synthetic fixture. No production measurements."

    fig, ax = plt.subplots(figsize=(10, 6))
    fig.subplots_adjust(left=0.12, right=0.96, top=0.82, bottom=0.19)
    epochs = np.arange(len(result["progress"]))
    ax.plot(epochs, result["progress"][:, 0], color=TRAIN, lw=2.8, label=train_label)
    ax.plot(epochs, result["progress"][:, 1], color=VALID, lw=2.2, ls="--", label=valid_label)
    ax.set_yscale("log")
    ax.set_xlabel("训练轮次（每轮一次完整数据更新）" if chinese else "Epoch (one full-batch update per epoch)")
    ax.set_ylabel(ylabel)
    ax.set_title("固定划分上的训练进展" if chinese else "Training progress on a fixed split", pad=25)
    ax.set_xlim(0, epochs[-1])
    ax.legend(frameon=False, loc="upper right")
    floor = result["progress"][-1, 0]
    ax.annotate(("趋于 " if chinese else "Approaches ") + f"{floor:.2f}",
                xy=(epochs[-1] * 0.65, floor), xytext=(epochs[-1] * 0.48, 4.8),
                arrowprops={"arrowstyle": "->", "color": INK}, fontsize=12)
    fig.text(0.12, 0.045, footer, fontsize=11, color="#53657a")
    save_figure(fig, "progress", language, "训练进展" if chinese else "Training progress")

    fig, ax = plt.subplots(figsize=(10, 6))
    fig.subplots_adjust(left=0.12, right=0.96, top=0.82, bottom=0.22)
    quantiles = np.quantile(result["scores"], [0.25, 0.5, 0.75], axis=0)
    for column, color, label, marker in [(0, TRAIN, train_label, "o"), (1, VALID, valid_label, "s")]:
        ax.plot(result["sizes"], quantiles[1, :, column], color=color,
                lw=2.4, marker=marker, label=label, ls="-" if column == 0 else "--")
        ax.fill_between(result["sizes"], quantiles[0, :, column],
                        quantiles[2, :, column], color=color, alpha=0.17)
    ax.set_xlabel("用于重新拟合的训练行数" if chinese else "Training rows used in each refit")
    ax.set_xticks(result["sizes"])
    ax.set_ylabel(ylabel)
    ax.set_ylim(bottom=0)
    ax.set_title("训练样本量与误差" if chinese else "Training size and prediction error", pad=25)
    ax.legend(frameon=False, loc="lower right")
    repeats = result["scores"].shape[0]
    note = (f"线：中位数；色带：{repeats} 次子采样的中间 50%，不是置信区间" if chinese
            else f"Lines: medians. Bands: middle 50% of {repeats} subsample orders; not confidence intervals.")
    fig.text(0.12, 0.095, note, fontsize=10.5, color="#53657a")
    fig.text(0.12, 0.04, footer, fontsize=11, color="#53657a")
    save_figure(fig, "sample-size", language, "训练样本量与误差" if chinese else "Training size and error")

    fig, ax = plt.subplots(figsize=(10, 6))
    fig.subplots_adjust(left=0.2, right=0.96, top=0.8, bottom=0.21)
    masks = [result["cold"] == 0, result["cold"] == 1]
    values = [result["residuals"][mask] for mask in masks]
    maes = [np.mean(np.abs(group)) for group in values]
    labels = [("热缓存" if chinese else "Warm") + f" (n={len(values[0])})",
              ("冷缓存" if chinese else "Cold") + f" (n={len(values[1])})"]
    bars = ax.barh([1, 0], maes, height=0.42, color=[TRAIN, VALID])
    for bar, group in zip(bars, values):
        text = (f"MAE {np.mean(np.abs(group)):.2f}；平均残差 {np.mean(group):+.2f}" if chinese
                else f"MAE {np.mean(np.abs(group)):.2f}; mean residual {np.mean(group):+.2f}")
        ax.text(0.06, bar.get_y() + bar.get_height() / 2, text,
                color=INK, va="center", fontsize=12,
                bbox={"facecolor": "white", "alpha": 0.94, "edgecolor": "none", "pad": 3})
    ax.set_yticks([1, 0], labels=labels)
    ax.set_xlim(0, max(maes) * 1.17)
    ax.set_ylim(-0.55, 1.55)
    ax.set_xlabel("平均绝对误差（分钟）" if chinese else "Mean absolute error (minutes)")
    ax.set_title("同一个平均值背后的分组误差" if chinese else "Group errors behind the overall average", pad=30)
    ax.grid(axis="y", visible=False)
    overall = np.mean(np.abs(result["residuals"]))
    summary = (f"总体 MAE：{overall:.3f} 分钟；负残差表示低估" if chinese
               else f"Overall MAE: {overall:.3f} minutes. Negative residuals mean underprediction.")
    fig.text(0.2, 0.1, summary, fontsize=11, color="#53657a")
    fig.text(0.2, 0.04, footer, fontsize=11, color="#53657a")
    save_figure(fig, "error-slices", language, "验证分组误差" if chinese else "Validation group errors")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cjk-font", type=Path)
    args = parser.parse_args()
    candidates = [args.cjk_font, Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
                  Path("/System/Library/Fonts/STHeiti Light.ttc")]
    cjk = next((p for p in candidates if p is not None and p.is_file()), None)
    if cjk is None:
        parser.error("Supply --cjk-font with a font containing Simplified Chinese glyphs")
    font_manager.fontManager.addfont(str(cjk))
    family = font_manager.FontProperties(fname=str(cjk)).get_name()
    source = re.search(r"```python\n(.*?)\n```", ARTICLE.read_text(), re.S)
    if source is None:
        raise ValueError("Article must contain its runnable Python experiment")
    # Execute only the trusted example committed in this local repository.
    namespace = {"__name__": "learning_curves_illustration_example"}
    exec(compile(source.group(1), str(ARTICLE), "exec"), namespace)
    result = namespace["run_experiment"]()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    draw_figures(result, "en", "DejaVu Sans")
    draw_figures(result, "zh", family)
    print(f"Generated six SVG figures from the published experiment in {OUTPUT}")


if __name__ == "__main__":
    main()
