---
title: "用户日志筛选与新交易信任评分"
description: "筛选在指定日期都有记录的用户，用精确的百分比分档给新交易评分，并在日志流中增量维护历史画像。"
lang: zh-CN
draft: false
---

两个按天划分的日志文件，引出了两个相关任务：先找出两天都出现、订单类型又足够多的用户，再根据用户历史给新交易评分。两部分都适合使用增量更新的哈希表，但状态的含义不同：筛选报告只看指定日期，新交易评分则可以使用所有已经记录的历史。

实现时最关键的一点，是先评分，再记录当前交易。否则，这笔交易就会成为证明自己“符合历史习惯”的依据。

## 题目

每条日志包含 `(date, userId, orderType, amount)`。读取和解析文件后，可以直接把记录交给算法；示例使用已经解析好的对象。

**第一部分。** 返回在每个指定日期都出现，并且这些日期合起来至少有 `minimumTypes` 种不同订单类型的用户。原题指定两天，且 `minimumTypes = 2`，下面把日期集合与类型门槛都作为输入。订单类型是任意字符串，不限定为 `phone`、`web`、`app`。

指定日期集合不能为空，类型门槛必须为正数。日期已经按照报告所用的日历规则统一，用户标识和类型名称采用区分大小写的精确匹配。

例如：

```text
day 1: (u1, phone, 100), (u1, phone, 120), (u2, web, 50), (u3, app, 70)
day 2: (u1, web, 200), (u2, web, 80), (u4, phone, 60)
result: [u1]
```

重复出现的 `phone` 只算一种类型。`u2` 两天都有记录，但只有 `web`；`u3`、`u4` 则各缺一天。如果某用户第一天有 `phone` 和 `web`，第二天只有 `phone`，同样符合条件。题目没有要求两天使用不同类型。

**第二部分。** 输入一笔新交易的 `(userId, orderType, amount)`，返回这笔交易的分数：

* 订单类型曾经出现，获得 `typePoints` 分，原题为 50 分。
* 金额落在历史闭区间 `[minimum, maximum]` 内，获得 `amountPoints` 分，原题为 50 分。
* 金额超出区间后，以被越过的端点为基准，每进入一个百分比档扣 `pointsPerStep` 分。原题档宽为 10%，每档扣 10 分，金额部分最低为零。

即使某用户没有通过第一部分的筛选，其已有历史也可以用于评分。不能只给合格用户建立评分画像。

## 先明确评分规则

“每多 10%”可以理解为进入一个新档就扣分，也可以理解为凑满一个档才扣分。本文采用**进入新档就扣分**：超出 5% 也扣一次。若采用只计算完整档的规则，这时便不扣分。恰好超出 10% 扣一次，而略高于 10% 就扣两次。后面的示例会直接体现这个选择。

百分比的分母取被越过的历史端点：高于区间时取最大值，低于区间时取最小值。不能用新金额或区间宽度作为分母。只有一条历史记录时，`minimum == maximum`，规则仍然有效。

金额采用同一币种的正整数最小单位。例如以分为单位时，100.00 写成 10000。解析层需要精确转换小数输入。零金额与负金额会被拒绝，因为退款和零基准值需要额外定义百分比规则。没有历史的新用户返回零分。这里计算的是单笔交易分数，不是给用户累计一个分数余额。

金额部分是否设下限，同样属于明确的策略选择。如果业务要求允许负分，可以取消零分下限，再定义输出范围；本文代码实现有下限的版本。这个分数来自题目给定的规则，不代表经过校准的概率。

## 算法：分别保存两类查询需要的信息

用哈希表将用户标识映射到画像。`record` 同时维护两组状态：

1. **所有已记录历史：** 精确的已见订单类型集合，以及历史最小、最大金额，用来回答后续评分查询。
2. **指定报告日期：** 用户出现过的指定日期，以及这些日期内最多 `minimumTypes` 种类型。报告日期之外的记录不能帮助用户通过筛选。

报告类型集合达到门槛后就可以停止增长。但历史类型集合仍要收录新类型，因为以后可能查询任意一种类型是否曾经出现。原题门槛为二时，单独做筛选只需保存第一种类型，再记录是否出现过另一种；截断集合把同一思路推广到了任意正整数门槛。

用户首次满足报告条件时，把其标识加入保持插入顺序的集合。`qualifiedUsers` 返回这些标识的副本，顺序为首次达到条件的顺序。重复日志不会增加日期或类型的去重计数，也不会让输出中出现重复用户。整个过程无需排序或保存全部原始日志。

一个分析器实例的指定日期和门槛保持固定。这对流式场景很重要：之后的新交易可以扩展评分历史，却不能改变此前两天报告的统计范围。改变报告窗口，需要重建报告状态，或另外维护能够过期的状态。

## 用整数精确计算百分比分档

将档宽配置为分数 `stepNumerator / stepDenominator`。10% 表示为 `1 / 10`，5% 表示为 `1 / 20`，既不用写死百分比，也不必把它近似成浮点数。

金额在区间外时，令 `boundary` 为被越过的端点，`difference` 为到该端点的正距离：

```text
steps = ceil(difference * stepDenominator / (boundary * stepNumerator))
amountScore = max(0, amountPoints - steps * pointsPerStep)
score = typeScore + amountScore
```

对正整数 `a`、`b`，有 `ceil(a / b) = (a + b - 1) // b`。Java 使用 `BigInteger` 计算中间乘积和除法，避免合法 `long` 金额在乘法中溢出；Python 全程使用整数运算。[Java BigInteger 文档](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/math/BigInteger.html)和 [Python 数值类型文档](https://docs.python.org/3.11/library/stdtypes.html#numeric-types-int-float-complex)说明了这些数值表示。

假设某用户的历史类型是 `{phone, web}`，金额范围为 100.00 至 200.00：

<div class="table-scroll" role="region" aria-label="进入新百分比档就扣分的交易评分示例" tabindex="0">

| 新类型 | 新金额 | 金额部分的计算 | 总分 |
| --- | ---: | --- | ---: |
| web | 180.00 | 区间内，获得 50 分 | 100 |
| store | 180.00 | 金额获得 50 分，类型未见过 | 50 |
| phone | 210.00 | 高于最大值 5%，扣一次 | 90 |
| phone | 220.00 | 恰好高出 10%，扣一次 | 90 |
| phone | 220.01 | 略高于 10%，扣两次 | 80 |
| store | 250.00 | 高出 25%，扣三次，类型未见过 | 20 |
| phone | 80.00 | 低于最小值 20%，扣两次 | 80 |

</div>

## Java 解法

保存为 `PurchaseAnalyzer.java`，使用 Java 17 或更高版本。三个核心操作是 `record`、`qualifiedUsers` 和 `score`。配置类和数据类用于明确各自职责。输入金额为正 `long` 整数，评分权重为非负整数，权重之和必须能由 `int` 表示。

```java
import java.math.BigInteger;
import java.util.*;

public class PurchaseAnalyzer {
    public record LogEntry(String day, String userId, String orderType, long amount) {}

    public record ScoringPolicy(int typePoints, int amountPoints,
                                long stepNumerator, long stepDenominator,
                                int pointsPerStep) {
        public ScoringPolicy {
            if (typePoints < 0 || amountPoints < 0 || pointsPerStep <= 0
                    || stepNumerator <= 0 || stepDenominator <= 0
                    || (long) typePoints + amountPoints > Integer.MAX_VALUE) {
                throw new IllegalArgumentException("Invalid scoring policy");
            }
        }
    }

    private static class UserProfile {
        final Set<String> seenTypes = new HashSet<>();
        final Set<String> reportDays = new HashSet<>();
        final Set<String> reportTypes = new HashSet<>();
        long minimum;
        long maximum;

        UserProfile(long amount) {
            minimum = maximum = amount;
        }
    }

    private final Set<String> requiredDays;
    private final int minimumTypes;
    private final ScoringPolicy policy;
    private final Map<String, UserProfile> profiles = new HashMap<>();
    private final Set<String> qualified = new LinkedHashSet<>();

    public PurchaseAnalyzer(Set<String> requiredDays, int minimumTypes,
                            ScoringPolicy policy) {
        Objects.requireNonNull(requiredDays, "Required days must not be null");
        if (requiredDays.isEmpty() || minimumTypes <= 0
                || requiredDays.stream().anyMatch(d -> d == null || d.isBlank())) {
            throw new IllegalArgumentException("Invalid reporting configuration");
        }
        this.requiredDays = Set.copyOf(requiredDays);
        this.minimumTypes = minimumTypes;
        this.policy = Objects.requireNonNull(policy, "A scoring policy is required");
    }

    public void record(LogEntry entry) {
        Objects.requireNonNull(entry, "A log entry is required");
        if (entry.day() == null || entry.day().isBlank()
                || entry.userId() == null || entry.userId().isBlank()
                || entry.orderType() == null || entry.orderType().isBlank()
                || entry.amount() <= 0) {
            throw new IllegalArgumentException("Invalid log entry");
        }

        // Preserve exact all-history membership and amount endpoints.
        UserProfile profile = profiles.computeIfAbsent(
                entry.userId(), key -> new UserProfile(entry.amount()));
        profile.seenTypes.add(entry.orderType());
        profile.minimum = Math.min(profile.minimum, entry.amount());
        profile.maximum = Math.max(profile.maximum, entry.amount());

        // Only selected dates contribute to the fixed report.
        if (requiredDays.contains(entry.day())) {
            profile.reportDays.add(entry.day());
            if (profile.reportTypes.size() < minimumTypes) {
                profile.reportTypes.add(entry.orderType());
            }
            if (profile.reportDays.size() == requiredDays.size()
                    && profile.reportTypes.size() == minimumTypes) {
                qualified.add(entry.userId());
            }
        }
    }

    public List<String> qualifiedUsers() {
        return new ArrayList<>(qualified);
    }

    public int score(String userId, String orderType, long amount) {
        if (userId == null || userId.isBlank()
                || orderType == null || orderType.isBlank() || amount <= 0) {
            throw new IllegalArgumentException("Invalid purchase");
        }
        UserProfile profile = profiles.get(userId);
        if (profile == null) return 0;

        // Scoring reads history and never adds the current purchase.
        int typeScore = profile.seenTypes.contains(orderType) ? policy.typePoints() : 0;
        if (amount >= profile.minimum && amount <= profile.maximum) {
            return typeScore + policy.amountPoints();
        }

        long boundary = amount < profile.minimum ? profile.minimum : profile.maximum;
        long difference = amount < boundary ? boundary - amount : amount - boundary;
        BigInteger numerator = BigInteger.valueOf(difference)
                .multiply(BigInteger.valueOf(policy.stepDenominator()));
        BigInteger denominator = BigInteger.valueOf(boundary)
                .multiply(BigInteger.valueOf(policy.stepNumerator()));
        BigInteger steps = numerator.add(denominator).subtract(BigInteger.ONE)
                .divide(denominator);
        BigInteger deduction = steps.multiply(BigInteger.valueOf(policy.pointsPerStep()));
        int amountScore = deduction.compareTo(BigInteger.valueOf(policy.amountPoints())) >= 0
                ? 0 : policy.amountPoints() - deduction.intValueExact();
        return typeScore + amountScore;
    }

    public static void main(String[] args) {
        var policy = new ScoringPolicy(50, 50, 1, 10, 10);
        var analyzer = new PurchaseAnalyzer(Set.of("2026-11-15", "2026-11-16"), 2, policy);

        // Test 1: Two daily files, duplicate types, and users missing a day.
        var history = List.of(
                new LogEntry("2026-11-15", "u1", "phone", 10000),
                new LogEntry("2026-11-15", "u1", "phone", 12000),
                new LogEntry("2026-11-15", "u2", "web", 5000),
                new LogEntry("2026-11-15", "u3", "app", 7000),
                new LogEntry("2026-11-16", "u1", "web", 20000),
                new LogEntry("2026-11-16", "u2", "web", 8000),
                new LogEntry("2026-11-16", "u4", "phone", 6000));
        for (LogEntry entry : history) analyzer.record(entry);
        System.out.println("qualified: " + analyzer.qualifiedUsers());

        // Test 2: Familiar/unfamiliar types, both endpoints, and an unknown user.
        System.out.println("inside: " + analyzer.score("u1", "web", 18000));
        System.out.println("unseen type: " + analyzer.score("u1", "store", 18000));
        System.out.println("minimum: " + analyzer.score("u1", "phone", 10000));
        System.out.println("maximum: " + analyzer.score("u1", "web", 20000));
        System.out.println("unknown user: " + analyzer.score("new", "web", 10000));

        // Test 3: Partial/exact bands, one unit beyond a band, and the score floor.
        System.out.println("above 5 percent: " + analyzer.score("u1", "phone", 21000));
        System.out.println("above 10 percent: " + analyzer.score("u1", "phone", 22000));
        System.out.println("past 10 percent: " + analyzer.score("u1", "phone", 22001));
        System.out.println("unseen above 25 percent: " + analyzer.score("u1", "store", 25000));
        System.out.println("below 20 percent: " + analyzer.score("u1", "phone", 8000));
        System.out.println("amount floor: " + analyzer.score("u1", "phone", 80000));

        // Test 4: A singleton history still defines a valid inclusive interval.
        analyzer.record(new LogEntry("2026-11-15", "single", "web", 8000));
        System.out.println("singleton: " + analyzer.score("single", "web", 7000));

        // Test 5: Score first, then record an accepted later-day purchase.
        var incoming = new LogEntry("2026-11-17", "u2", "phone", 9000);
        System.out.println("stream before: " + analyzer.score("u2", "phone", 9000));
        analyzer.record(incoming);
        System.out.println("stream after: " + analyzer.score("u2", "phone", 9000));
        System.out.println("fixed report: " + analyzer.qualifiedUsers());

        // Test 6: Three dates, three types, and a different scoring policy.
        var custom = new PurchaseAnalyzer(Set.of("d1", "d2", "d3"), 3,
                new ScoringPolicy(20, 30, 1, 20, 7));
        custom.record(new LogEntry("d1", "sam", "phone", 10000));
        custom.record(new LogEntry("d2", "sam", "web", 10000));
        custom.record(new LogEntry("d3", "sam", "app", 10000));
        System.out.println("custom qualified: " + custom.qualifiedUsers());
        System.out.println("custom score: " + custom.score("sam", "web", 11000));

        // Test 7: Large amounts distinguish an exact boundary from its next unit.
        analyzer.record(new LogEntry("2026-11-15", "large", "web", 1000000000000000000L));
        analyzer.record(new LogEntry("2026-11-16", "large", "web", 2000000000000000000L));
        System.out.println("large exact: " + analyzer.score("large", "web", 2200000000000000000L));
        System.out.println("large next: " + analyzer.score("large", "web", 2200000000000000001L));

        // Test 8: Empty history and invalid amounts follow the explicit contract.
        var empty = new PurchaseAnalyzer(Set.of("d1"), 1, policy);
        System.out.println("empty qualified: " + empty.qualifiedUsers());
        try {
            analyzer.score("u1", "web", 0);
        } catch (IllegalArgumentException exception) {
            System.out.println("invalid amount: rejected");
        }
    }
}
```

## Python 解法

使用 Python 3.9 或更高版本，三个核心操作的含义与 Java 一致。字典保留用户首次达到条件的顺序，返回新的键列表，避免调用者修改内部状态。Python 接受正整数金额，也支持超过 Java `long` 范围的数值。

```python
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Set


@dataclass(frozen=True)
class LogEntry:
    day: str
    user_id: str
    order_type: str
    amount: int


@dataclass(frozen=True)
class ScoringPolicy:
    type_points: int
    amount_points: int
    step_numerator: int
    step_denominator: int
    points_per_step: int

    def __post_init__(self):
        values = (self.type_points, self.amount_points, self.step_numerator,
                  self.step_denominator, self.points_per_step)
        if (any(type(value) is not int for value in values)
                or self.type_points < 0 or self.amount_points < 0
                or self.step_numerator <= 0 or self.step_denominator <= 0
                or self.points_per_step <= 0):
            raise ValueError("Invalid scoring policy")


@dataclass
class UserProfile:
    minimum: int
    maximum: int
    seen_types: Set[str] = field(default_factory=set)
    report_days: Set[str] = field(default_factory=set)
    report_types: Set[str] = field(default_factory=set)


class PurchaseAnalyzer:
    def __init__(self, required_days: Iterable[str], minimum_types: int,
                 policy: ScoringPolicy):
        days = frozenset(required_days)
        if (not days or type(minimum_types) is not int or minimum_types <= 0
                or any(not isinstance(day, str) or not day.strip() for day in days)):
            raise ValueError("Invalid reporting configuration")
        if not isinstance(policy, ScoringPolicy):
            raise ValueError("A scoring policy is required")
        self._required_days = days
        self._minimum_types = minimum_types
        self._policy = policy
        self._profiles: Dict[str, UserProfile] = {}
        self._qualified: Dict[str, None] = {}

    def record(self, entry: LogEntry) -> None:
        if (not isinstance(entry, LogEntry)
                or any(not isinstance(value, str) or not value.strip()
                       for value in (entry.day, entry.user_id, entry.order_type))
                or type(entry.amount) is not int or entry.amount <= 0):
            raise ValueError("Invalid log entry")

        # Preserve exact all-history membership and amount endpoints.
        profile = self._profiles.get(entry.user_id)
        if profile is None:
            profile = UserProfile(entry.amount, entry.amount)
            self._profiles[entry.user_id] = profile
        profile.seen_types.add(entry.order_type)
        profile.minimum = min(profile.minimum, entry.amount)
        profile.maximum = max(profile.maximum, entry.amount)

        # Only selected dates contribute to the fixed report.
        if entry.day in self._required_days:
            profile.report_days.add(entry.day)
            if len(profile.report_types) < self._minimum_types:
                profile.report_types.add(entry.order_type)
            if (len(profile.report_days) == len(self._required_days)
                    and len(profile.report_types) == self._minimum_types):
                self._qualified[entry.user_id] = None

    def qualified_users(self) -> List[str]:
        return list(self._qualified)

    def score(self, user_id: str, order_type: str, amount: int) -> int:
        if (any(not isinstance(value, str) or not value.strip()
                for value in (user_id, order_type))
                or type(amount) is not int or amount <= 0):
            raise ValueError("Invalid purchase")
        profile = self._profiles.get(user_id)
        if profile is None:
            return 0

        # Scoring reads history and never adds the current purchase.
        policy = self._policy
        type_score = policy.type_points if order_type in profile.seen_types else 0
        if profile.minimum <= amount <= profile.maximum:
            return type_score + policy.amount_points

        boundary = profile.minimum if amount < profile.minimum else profile.maximum
        difference = abs(amount - boundary)
        numerator = difference * policy.step_denominator
        denominator = boundary * policy.step_numerator
        steps = (numerator + denominator - 1) // denominator
        amount_score = max(0, policy.amount_points - steps * policy.points_per_step)
        return type_score + amount_score


def main():
    policy = ScoringPolicy(50, 50, 1, 10, 10)
    analyzer = PurchaseAnalyzer({"2026-11-15", "2026-11-16"}, 2, policy)

    # Test 1: Two daily files, duplicate types, and users missing a day.
    history = [
        LogEntry("2026-11-15", "u1", "phone", 10000),
        LogEntry("2026-11-15", "u1", "phone", 12000),
        LogEntry("2026-11-15", "u2", "web", 5000),
        LogEntry("2026-11-15", "u3", "app", 7000),
        LogEntry("2026-11-16", "u1", "web", 20000),
        LogEntry("2026-11-16", "u2", "web", 8000),
        LogEntry("2026-11-16", "u4", "phone", 6000),
    ]
    for entry in history:
        analyzer.record(entry)
    print("qualified:", analyzer.qualified_users())

    # Test 2: Familiar/unfamiliar types, both endpoints, and an unknown user.
    print("inside:", analyzer.score("u1", "web", 18000))
    print("unseen type:", analyzer.score("u1", "store", 18000))
    print("minimum:", analyzer.score("u1", "phone", 10000))
    print("maximum:", analyzer.score("u1", "web", 20000))
    print("unknown user:", analyzer.score("new", "web", 10000))

    # Test 3: Partial/exact bands, one unit beyond a band, and the score floor.
    print("above 5 percent:", analyzer.score("u1", "phone", 21000))
    print("above 10 percent:", analyzer.score("u1", "phone", 22000))
    print("past 10 percent:", analyzer.score("u1", "phone", 22001))
    print("unseen above 25 percent:", analyzer.score("u1", "store", 25000))
    print("below 20 percent:", analyzer.score("u1", "phone", 8000))
    print("amount floor:", analyzer.score("u1", "phone", 80000))

    # Test 4: A singleton history still defines a valid inclusive interval.
    analyzer.record(LogEntry("2026-11-15", "single", "web", 8000))
    print("singleton:", analyzer.score("single", "web", 7000))

    # Test 5: Score first, then record an accepted later-day purchase.
    incoming = LogEntry("2026-11-17", "u2", "phone", 9000)
    print("stream before:", analyzer.score("u2", "phone", 9000))
    analyzer.record(incoming)
    print("stream after:", analyzer.score("u2", "phone", 9000))
    print("fixed report:", analyzer.qualified_users())

    # Test 6: Three dates, three types, and a different scoring policy.
    custom = PurchaseAnalyzer({"d1", "d2", "d3"}, 3, ScoringPolicy(20, 30, 1, 20, 7))
    custom.record(LogEntry("d1", "sam", "phone", 10000))
    custom.record(LogEntry("d2", "sam", "web", 10000))
    custom.record(LogEntry("d3", "sam", "app", 10000))
    print("custom qualified:", custom.qualified_users())
    print("custom score:", custom.score("sam", "web", 11000))

    # Test 7: Large amounts distinguish an exact boundary from its next unit.
    analyzer.record(LogEntry("2026-11-15", "large", "web", 1000000000000000000))
    analyzer.record(LogEntry("2026-11-16", "large", "web", 2000000000000000000))
    print("large exact:", analyzer.score("large", "web", 2200000000000000000))
    print("large next:", analyzer.score("large", "web", 2200000000000000001))

    # Test 8: Empty history and invalid amounts follow the explicit contract.
    empty = PurchaseAnalyzer({"d1"}, 1, policy)
    print("empty qualified:", empty.qualified_users())
    try:
        analyzer.score("u1", "web", 0)
    except ValueError:
        print("invalid amount: rejected")


if __name__ == "__main__":
    main()
```

## 预期输出

Java 输出列表中的用户标识不带引号，Python 的列表表示带引号；数值与顺序一致。Java 的输出如下：

```text
qualified: [u1]
inside: 100
unseen type: 50
minimum: 100
maximum: 100
unknown user: 0
above 5 percent: 90
above 10 percent: 90
past 10 percent: 80
unseen above 25 percent: 20
below 20 percent: 80
amount floor: 50
singleton: 80
stream before: 30
stream after: 100
fixed report: [u1]
custom qualified: [sam]
custom score: 36
large exact: 90
large next: 80
empty qualified: []
invalid amount: rejected
```

流式示例中的 `u2` 原先只有 `web`，历史金额为 50.00 至 80.00。新来的 `phone` 交易金额为 90.00，类型不得分，金额扣两档，所以得到 30 分。记录这笔交易后，相同输入的后续查询得到 100 分。由于新交易日期不在原报告范围内，`u2` 仍然不符合那份两天报告的筛选条件。

## 正确性说明

每记录一条日志，画像中的历史类型集合都恰好包含该用户已经记录的类型，两个端点分别是已记录金额的最小值与最大值。集合插入以及 `min`、`max` 更新会保持这一性质。因此，`score` 可以直接读取所需历史，且不会改变历史。

报告中的 `reportDays` 恰好包含用户出现过的指定日期。范围外的日期不会进入这个集合，所以大小达到指定日期数，就能证明每个指定日期都出现过。`reportTypes` 在达到门槛前保留完整的不同类型，达到门槛后，增加更多类型也不会改变筛选结论。对于固定报告和只追加的输入，这两个条件都不会从真变假，所以已合格的标识可以保留在输出集合中。

金额超出区间时，整数向上取整精确给出已经进入的分档数量，再乘以每档扣分并应用下限，就实现了所选的金额规则。正金额和正档宽参数保证分母非零。

## 时间与空间复杂度

设 `N` 为记录条数，`D` 为指定日期数，`U` 为用户数，`T` 为所有历史中不同 `(用户, 类型)` 对的数量，`P` 为不同 `(用户, 指定日期)` 对的数量，`Q` 为符合条件的用户数。

* 构造器耗时 `O(D)`，每次 `record` 的哈希操作期望耗时 `O(1)`。处理全部日志并取出一次报告，期望耗时为 `O(D + N + Q)`。最坏情况下必须检查每条无序日志，输出也必须写出相应用户标识。
* 每次 `score` 使用期望 `O(1)` 次哈希操作和固定数量的算术操作，不会扫描用户历史。Java 输入位宽固定，中间整数位数有界；Python 使用任意大的整数时，算术耗时随位数增长。因此，常数时间分析假设数值精度和键长度有界。
* 保留状态占 `O(D + U + T + P)`，其中 `P <= U * D`。报告类型截断集合的总大小不超过 `T`，合格标识数不超过 `U`，返回列表另占 `O(Q)` 输出空间。原题指定两天时，可以简化为 `O(U + T)`。如果每个用户能出现任意多种类型，就不能直接写成 `O(U)`。

如果只做第一部分，可以省略评分状态，报告类型集合的空间为 `sum(min(K, C_u))`，其中 `K` 为门槛，`C_u` 为各用户在报告日期内的不同类型数。如果类型来自很小的固定目录，还可以用位集合表示成员关系；通用解法不依赖这样的目录。

## 流式处理：先做决定，再更新历史

历史日志到达后，逐条调用 `record`，无需先把整个文件读成内存列表。对于新交易，先调用 `score`，决定它是否应该成为历史，再调用 `record`。示例接纳了新交易，但评分方法本身保持只读。

```mermaid
flowchart LR
    A["读取此前的<br/>用户历史"] --> B["对新交易<br/>计算分数"]
    B --> C["接纳交易后<br/>再记录历史"]
```

*图1：评分前，不能让新交易扩展自己的历史金额范围，也不能让自己的类型提前成为已见类型。*

示例分析器按单线程使用。并发处理时，需要按用户串行执行完整的读取、评分和接纳后更新流程。仅替换成并发哈希表，不会自动使可变画像或这整个流程具备原子性。

重复记录同一条历史，不会改变类型成员关系和金额端点。但**重复执行评分决定不同**：第一次更新被接纳后，同一交易重试可能得到另一个分数。若重试必须返回原分数，需要事件标识与已经保存的决定，或其他明确的去重策略；原题没有提供这些字段。

迟到的历史日志最终会让类型集合和金额极值收敛到相同结果，但已经返回的评分只使用了当时可见的历史。若按事件发生时间评分，需要明确等待或修订决定的规则。滚动窗口还需要类型引用计数与能够移除过期金额的极值结构；仅让长期不活跃的用户整体过期，不能精确实现滑动窗口。这些扩展都会改变当前只追加解法的状态需求。
