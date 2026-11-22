---
title: "如何阅读学习曲线与分析失败案例"
description: "区分训练进展曲线与样本量曲线，复现一个小型 NumPy 实验，再用残差排查平均分数掩盖的失败。"
lang: zh-CN
draft: false
---

构建耗时预测器的训练误差和验证误差，逐渐稳定在几乎相同的数值。团队继续训练，投诉却没有减少：没有热缓存的构建，总比预测晚得多才结束。两条平滑曲线没有说明哪些案例失败，也没有指出什么改动可能有效。

本节接续[实验记录、版本管理与复现](/ai/experiment-records-version-control-and-reproduction/)，假设你已经了解训练与验证划分、均方误差（MSE）、平均绝对误差（MAE），以及常数模型和直线模型的拟合。学完后，你应当能够：

- 识别每条曲线改变了什么，以及评估了哪些观测。
- 将曲线模式作为需要对照检验的假设。
- 复现小型实验，按案例组检查带方向的误差。
- 选择下一项实验，同时保留未使用的最终评估。

## 先读坐标轴与测量流程

**训练进展曲线**将指标画在训练步数、轮次或计算量的坐标上。一轮表示遍历一次训练样本，不一定只更新一次参数。**样本量学习曲线**比较用不同数量训练数据重新拟合后的表现。改变训练轮次和改变数据量，回答不同问题。验证曲线也可以改变某项配置，此时横轴必须明确是哪项配置。

在检查点 `t`，对当前模型在指定数据集 `D` 上进行评估：

```math
E_t(D)=\frac{1}{m}\sum_{i=1}^{m}\left(\widehat y_i^{(t)}-y_i\right)^2,
\qquad G_t=E_t(D_{\mathrm{validation}})-E_t(D_{\mathrm{train}}).
```

标签和预测都是长度为 `m` 的向量，每项为以分钟计的标量耗时，且 `m > 0`。MSE 与间隔 `G_t` 的单位均为分钟平方。MSE 越低越好。间隔比较的是两个数据集，单独看大小不能说明性能是否可接受。准确率的方向相反，库返回的负损失分数也需要先理解符号含义，再绘图。

每个检查点都使用相同预测流程和指标定义。如果训练目标额外包含惩罚项，就不能与只计算 MSE 的验证结果直接比较。记录训练指标来自不断变化的小批次，还是来自固定检查点在完整训练集上的评估。预处理需要一致，而且只能从允许使用的训练数据中学习；[scikit-learn 的常见问题指南](https://scikit-learn.org/stable/common_pitfalls.html)解释了这一边界。

## 用曲线模式选择调查方向

<div class="table-scroll" role="region" aria-label="学习曲线观察与对照调查" tabindex="0">

| 误差口径可比时的观察 | 可能解释 | 有用的检查 |
| --- | --- | --- |
| 训练误差下降，验证误差上升 | 开始拟合训练样本特有的细节 | 比较较早检查点，并验证数据划分 |
| 两者都停在高于实用基线或目标的位置 | 缺少信息、模型受限、噪声，或优化尚未完成 | 在小样例上检查拟合、特征和标签质量 |
| 训练与验证间隔很大 | 对训练样本敏感，或人群分布不一致 | 检查分组，并重复适当的数据划分 |
| 验证结果剧烈波动 | 验证样本少、拟合不稳定，或测量变化 | 保留案例，检查预先规定的重复实验之间的变化 |
| 验证误差低于训练误差 | 案例难度或评估条件不同 | 检查数据组成与指标定义 |

</div>

**过拟合**是模型适应训练数据特有细节，从而损害目标未见人群上的表现。**欠拟合**是拟合后的预测器没有捕捉有用结构。曲线可以提示这两种解释，却不能唯一确定原因。[Google 的损失曲线指南](https://developers.google.com/machine-learning/crash-course/overfitting/interpreting-loss-curves)用训练与验证行为指导诊断。

按照预先声明的验证规则选择较早检查点，可以限制过拟合。要记录所选检查点和选择投入。反复根据同一组验证结果修改模型，也会逐渐适应该组案例，因此仍需要独立的最终测试。

## 构造一个已知缺少输入的样例

使用一个刻意构造的合成构建服务，耗时为：

```math
y_i=5+2x_i+4c_i,
\qquad z_i=\frac{x_i-4.5}{3.5},
\qquad \widehat y_i=b+az_i.
```

大小 `x_i` 是任意工作量单位下的标量。指示变量 `c_i` 在冷缓存时为一，热缓存时为零。耗时与两个模型系数都以分钟计，`z_i` 无量纲。固定的单位转换常数在评估之前声明，没有额外标签噪声。预测器接收大小，却刻意不接收缓存状态。

训练集把一至八的大小重复八遍，其中七遍为热缓存，一遍为冷缓存。验证集的分组数量相同，但使用从 1.5 至 7.5 等间距排列的八个大小。每个划分中的六十四行，都是合成记录，不能作为来自实际代码仓库的独立证据。这份诊断样例没有最终测试集。

只使用大小的拟合直线趋于 `5.5 + 2x`。多出来的 0.5，是平均缓存成本 `4 × 8/64`。因此，热缓存案例的残差为 0.5，冷缓存为 −3.5。训练标签均值构成常数基线，其验证 MSE 为 17.1786。直线模型的极限 MSE 为 `(56 × 0.5² + 8 × 3.5²)/64 = 1.75`。训练与验证误差相等，仍然可以存在系统性的输入遗漏。

## 记录训练进展，但不用验证标签拟合

在这个小例子中，每轮使用全部训练行更新一次。设计矩阵 `A` 的形状为 `(n, 2)`，每行为 `[1, z_i]`；系数 `θ = [b, a]` 的形状为 `(2,)`。残差 `r = Aθ − y` 的形状为 `(n,)`。

将第 `j` 个系数改变一个小量 `δ`，MSE 的变化为：

```math
\begin{aligned}
E(\theta+\delta e_j)-E(\theta)
&=\frac{2\delta}{n}\sum_i A_{ij}r_i
+\frac{\delta^2}{n}\sum_i A_{ij}^2,\\
g_j&=\frac{2}{n}\sum_i A_{ij}r_i,\qquad
\theta_{t+1}=\theta_t-\eta g.
\end{aligned}
```

这里，`e_j` 是选择第 `j` 个系数的长度为二的向量，`δ` 是以分钟计的系数变化。展开每项残差平方，就得到一次项和二次项。`δ` 的一次项系数给出梯度分量 `g_j`，表示误差局部增加的方向。沿相反方向迈足够小的一步，可以降低这个二次目标。无量纲步长 `η = 0.2` 适用于本例，不是通用学习率建议。

程序需要 Python 3.9+ 和 NumPy，执行时不需要外部文件、下载或凭证。保存为 `learning_curves.py`。预测是长度为六十四的向量。样本量实验用 [NumPy 最小二乘](https://numpy.org/doc/stable/reference/generated/numpy.linalg.lstsq.html)从头拟合，不复用迭代训练的模型。每次重复抽取一套排列，再取嵌套训练子集；验证集保持不变。

```python
import numpy as np


def make_data(validation=False):
    sizes = np.linspace(1.5, 7.5, 8) if validation else np.arange(1.0, 9.0)
    size = np.tile(sizes, 8)
    cold = np.repeat(np.array([0] * 7 + [1]), len(sizes))
    # Fixed unit conversion, declared in advance rather than fitted to a split.
    z = (size - 4.5) / 3.5
    design = np.column_stack((np.ones(size.size), z))
    minutes = 5.0 + 2.0 * size + 4.0 * cold
    return design, minutes, cold


def run_experiment(epochs=80, step=0.2, repeats=20, seed=7):
    train, y_train, _ = make_data()
    valid, y_valid, cold = make_data(validation=True)
    coefficients = np.zeros(train.shape[1])
    progress = np.empty((epochs + 1, 2))
    # One epoch uses every training row once in a single full-batch update.
    for epoch in range(epochs + 1):
        residual = train @ coefficients - y_train
        progress[epoch] = [np.mean(residual ** 2),
                           np.mean((valid @ coefficients - y_valid) ** 2)]
        if epoch < epochs:
            coefficients -= step * (2.0 / len(y_train)) * (train.T @ residual)

    sizes = np.array([8, 16, 32, len(y_train)])
    scores = np.empty((repeats, len(sizes), 2))
    rng = np.random.Generator(np.random.PCG64(seed))
    # Each repeat has nested subsets; every size is refitted from scratch.
    for repeat in range(repeats):
        order = rng.permutation(len(y_train))
        for j, count in enumerate(sizes):
            ids = order[:count]
            fitted, _, rank, _ = np.linalg.lstsq(train[ids], y_train[ids], rcond=None)
            if rank != train.shape[1]:
                raise ValueError("Training subset must support both coefficients")
            scores[repeat, j] = [np.mean((train[ids] @ fitted - y_train[ids]) ** 2),
                                  np.mean((valid @ fitted - y_valid) ** 2)]

    residuals = valid @ coefficients - y_valid
    baseline_mse = np.mean((y_valid - y_train.mean()) ** 2)
    return {"progress": progress, "sizes": sizes, "scores": scores,
            "coefficients": coefficients, "residuals": residuals,
            "cold": cold, "baseline_mse": baseline_mse}


def main():
    result = run_experiment()
    print("epoch train_MSE validation_MSE")
    for epoch in [0, 10, 80]:
        train_error, valid_error = result["progress"][epoch]
        print(f"{epoch:5d} {train_error:.4f} {valid_error:.4f}")
    print("rows median_train_MSE median_validation_MSE")
    medians = np.median(result["scores"], axis=0)
    for size, (train_error, valid_error) in zip(result["sizes"], medians):
        print(f"{size:4d} {train_error:.4f} {valid_error:.4f}")
    print(f"constant baseline validation MSE: {result['baseline_mse']:.4f}")
    for name, mask in [("warm", result["cold"] == 0),
                       ("cold", result["cold"] == 1)]:
        values = result["residuals"][mask]
        print(f"{name}: n={len(values)} MAE={np.mean(np.abs(values)):.4f} "
              f"mean_residual={np.mean(values):.4f}")
    print(f"overall validation MAE: {np.mean(np.abs(result['residuals'])):.4f}")


if __name__ == "__main__":
    main()
```

以下输出已在 Python 3.11.4 和 NumPy 2.0.2 下执行验证，显示值经过四舍五入：

```text
epoch train_MSE validation_MSE
    0 233.0000 227.4286
   10 2.2461 2.1165
   80 1.7500 1.7500
rows median_train_MSE median_validation_MSE
   8 0.4348 2.0000
  16 1.2466 1.8621
  32 1.6856 1.7680
  64 1.7500 1.7500
constant baseline validation MSE: 17.1786
warm: n=56 MAE=0.5000 mean_residual=0.5000
cold: n=8 MAE=3.5000 mean_residual=-3.5000
overall validation MAE: 0.8750
```

<figure>
  <div class="figure-scroll" role="region" aria-label="训练进展图" tabindex="0" style="overflow-x: auto;">
    <img src="/images/ai/learning-curves/progress-zh.svg" alt="计算得到的训练与验证 MSE，在八十轮中趋于 1.75；纵轴使用对数刻度。" width="1200" height="720" style="min-width: 640px;" loading="lazy" decoding="async" />
  </div>
  <figcaption>图 1：来自合成样例的计算结果。对数纵轴表示倍数差异。继续拟合趋于一个下限，本例的下限来自缺少缓存输入。</figcaption>
</figure>

## 固定比较流程，再改变训练量

<figure>
  <div class="figure-scroll" role="region" aria-label="训练样本量图" tabindex="0" style="overflow-x: auto;">
    <img src="/images/ai/learning-curves/sample-size-zh.svg" alt="训练行数为八、十六、三十二和六十四时的训练与验证 MSE 中位数，以及二十次子采样顺序产生的四分位区间。" width="1200" height="720" style="min-width: 640px;" loading="lazy" decoding="async" />
  </div>
  <figcaption>图 2：使用同一合成数据池，在每个样本量下重新拟合。线表示中位数，色带表示二十次重复子采样结果中间的一半；验证行始终相同。</figcaption>
</figure>

小训练子集可能特别适合其观测到的分组比例，却不能准确估计被遗漏的缓存影响。加入更多行后，验证误差中位数下降，训练误差上升，两者趋于 1.75。训练误差上升，不表示优化失败，因为被评估的训练人群改变了。

色带描述的是这个有限数据池内对子采样的敏感程度，不是未来生产误差的置信区间。使用六十四行时，每次重复都使用相同完整数据池，色带因此收缩为零，却不能证明对新数据具有确定性。[scikit-learn 的学习曲线指南](https://scikit-learn.org/stable/modules/learning_curve.html)解释了训练样本量比较；本例保留一个固定验证集，没有进行交叉验证。

更具代表性的数据可能帮助对样本敏感的模型。但在两种缓存组共享每个大小的情况下，它不能替这个受限预测器提供缺少的逐案例区别。单独一段平台期，也不能证明其他问题中增加数据没有用。

## 按身份、方向和分组检查误差

**残差**等于预测减标签，负数表示低估。排序误差前，先根据记录 ID 对齐预测；位置错配可以制造看似存在的失败模式。除了大误差，也应系统抽查普通案例，不要只挑几个印象深刻的例子。

<figure>
  <div class="figure-scroll" role="region" aria-label="验证分组误差图" tabindex="0" style="overflow-x: auto;">
    <img src="/images/ai/learning-curves/error-slices-zh.svg" alt="五十六个热缓存验证案例的 MAE 为 0.5 分钟，八个冷缓存案例为 3.5 分钟；两组平均残差符号相反。" width="1200" height="720" style="min-width: 640px;" loading="lazy" decoding="async" />
  </div>
  <figcaption>图 3：在合成样例上训练八十轮后，冷缓存案例被系统性低估。分组数量和带方向的残差，解释了总体平均值掩盖的行为。</figcaption>
</figure>

以验证集大小 1.5 为例，模型对两个组都预测约 8.5 分钟。热缓存标签为八分钟，冷缓存标签为十二分钟。两个大小相同的案例，因为缺少一个输入，出现了不同误差。

总体 MAE 为：

```math
\operatorname{MAE}
=\frac{56(0.5)+8(3.5)}{64}
=0.875\ \text{minutes}.
```

每组绝对误差按案例数加权。让两个组等权，回答的是另一个问题。八个冷缓存案例贡献的绝对误差，与全部五十六个热缓存案例相同。未来分组比例改变时，即使每组误差不变，总体指标也会改变。

为每个审核案例记录可用输入、预测时点、标签定义、带方向的误差、分组归属，以及可检验的解释。有用的分类包括标签错误、缺少可用信息、预处理不一致、不熟悉的人群，以及模型无法表示所需区别。多个原因可以共存；分组结果是调查证据，不能单独证明因果。

## 把诊断转化为对照改动

缓存模式提示我们，可以测试一个预测时已经可用的缓存状态输入。把候选重新拟合后，与只使用大小的模型在相同案例和指标上比较，并检查两个分组。如果缓存状态在执行结束后才知道，使用它就会泄露信息，应寻找提前可用的信号，或修改预测约定。

实际构建数据应在符合部署方式时，按时间或代码仓库划分；需要时，将相关记录放在同一组。保留分组数量和不确定性，再检查诊断出的模式是否出现在额外验证证据中。最终测试前冻结所选流程；如果根据最终测试失败来选择下一项修复，就已经消耗了该测试的独立性。

当测量流程与案例层面的解释一致时，曲线才能支持决策。平均值稳定、间隔很小，或者运行可以复现，都不能代替这些检查。

## 要点

- 训练进展与训练样本量曲线改变不同数量，需要不同解释。
- 先比较口径一致的指标与数据，再为间隔或平台期寻找原因。
- 检查带方向的残差和分组数量，发现总体性能掩盖的系统性错误。
- 用允许的输入检验一项解释，保存运行记录，并保护最终评估。

## 练习

1. 未来样本包含九十个热缓存构建、十个冷缓存构建。假设分组残差与拟合样例相同，计算总体 MAE 和平均带符号残差。解释为什么更小的总体 MAE 不能说明预测器改善。
2. 在预先规定的多次重复中，训练 MSE 持续下降，验证 MSE 却在第十二轮后上升。提出检查点选择规则，并说明将模式归因于过拟合之前要检查的两件事。最终测试应该怎样使用？
3. 某个拟加入的缓存状态特征，只在构建完成时才写入。设计一项有效的下一步实验，在预测时不使用该字段的前提下，调查冷缓存构建失败。

## 答案提示

1. MAE 为 `(90 × 0.5 + 10 × 3.5)/100 = 0.8` 分钟，平均残差为 `(90 × 0.5 − 10 × 3.5)/100 = 0.1` 分钟。改变的只是分组比例，冷缓存构建仍然有同样的低估。
2. 提前规定验证标准，例如选择验证 MSE 最低的检查点，并固定同分规则。检查指标和评估条件是否一致，以及划分是否代表目标人群、是否存在相关记录泄漏。冻结训练与选择流程后，再评估未使用的最终数据。这几次重复在第十二轮后上升，不保证以后每次运行都应选择第十二轮。
3. 检查提交时的缓存元数据或其他允许的信号，并验证其可用性。如果存在，加入该输入重新拟合，再用共享验证案例比较总体和分组误差。如果不存在，可以评估不同预测目标，或明确表达不确定性的估计。完成时字段可以作为分析分组标签，却不能成为更早预测时的输入。

## 已查阅参考资料

- [Google 的损失曲线解释](https://developers.google.com/machine-learning/crash-course/overfitting/interpreting-loss-curves)说明训练进展曲线如何指导拟合与泛化检查。
- [scikit-learn 的学习与验证曲线](https://scikit-learn.org/stable/modules/learning_curve.html)区分样本量比较与配置比较。
- [NumPy 最小二乘](https://numpy.org/doc/stable/reference/generated/numpy.linalg.lstsq.html)说明本例使用的系数形状、残差和秩信息。
- [scikit-learn 的常见问题](https://scikit-learn.org/stable/common_pitfalls.html)解释一致预处理、数据泄漏和实验随机性。
