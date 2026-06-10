export interface ChallengeLevel {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  concepts: string[];
  requirements: string;
  starterCode: string;
}

export interface Challenge {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  levels: ChallengeLevel[];
}

export const CHALLENGES: Challenge[] = [
  {
    id: 'event-logger',
    title: 'Event Logger',
    subtitle: '事件批量日志收集器',
    description: '设计一个异步高性能的日志上传模块，业务线程只管快速写入队列，后台线程负责批量或定时打包发送到网络，防止阻塞业务。',
    levels: [
      {
        id: 'l1',
        title: 'Level 1: 基础有界阻塞队列与定时 Flush',
        difficulty: 'EASY',
        concepts: ['BlockingQueue', 'Thread', 'volatile', '定时心跳/轮询'],
        requirements: `### 关卡目标\n实现一个线程安全的 \`EventLogger\`。多个业务线程可以并发调用 \`logEvent()\`，要求极快返回。后台需要有一个 daemon 线程在以下条件之一满足时触发网络批量发送：\n1. 缓冲区中的日志条数达到了 \`batchSize\`。\n2. 距离上次发送日志时间超过了 \`flushIntervalMs\`。\n\n### 约束条件\n- **不允许**忙等待（Busy Spinning），在没有日志或者未到达发送时间时，后台工作线程必须挂起以节省 CPU。\n- 业务线程调用 \`logEvent()\` 不得被网络 I/O 阻塞。`,
        starterCode: `import java.util.*;\nimport java.util.concurrent.*;\n\npublic class EventLogger {\n    private final int batchSize;\n    private final long flushIntervalMs;\n    private final NetworkClient networkClient;\n    \n    // TODO: 定义您的成员变量（如 BlockingQueue, Thread, volatile 时间戳等）\n\n    public interface NetworkClient {\n        void sendLogs(List<String> logs);\n    }\n\n    public EventLogger(int batchSize, long flushIntervalMs, NetworkClient client) {\n        this.batchSize = batchSize;\n        this.flushIntervalMs = flushIntervalMs;\n        this.networkClient = client;\n        // TODO: 初始化并启动后台工作线程\n    }\n\n    public void logEvent(String event) {\n        // TODO: 快速将日志写入缓冲，不得阻塞\n    }\n\n    public void shutdown() {\n        // TODO: 优雅关闭，本关卡暂时不作强校验，但须合理关闭线程\n    }\n}`
      },
      {
        id: 'l2',
        title: 'Level 2: 双缓冲无锁写入 (Double-Buffer Swap)',
        difficulty: 'MEDIUM',
        concepts: ['Double Buffering', 'AtomicReference', 'CAS', '降低锁竞争'],
        requirements: `### 关卡目标\n在高并发写入场景下，多个生产者线程和单个消费者线程如果并发争抢同一个 \`BlockingQueue\` 的锁，会导致严重的锁竞争与上下文切换。\n请使用**双缓冲（Double Buffering）**机制重新设计：\n1. 维护两个 List：\`writeBuffer\`（写缓冲区）和 \`flushBuffer\`（刷盘/发送缓冲区）。\n2. 生产者线程通过 CAS 或轻量锁向 \`writeBuffer\` 写入日志。\n3. 当触发 Flush 时，消费者线程**原子性地交换**这两个 Buffer 的引用，然后消费者线程去发送 \`flushBuffer\`，在此期间生产者线程可以毫无阻碍地继续写入新的 \`writeBuffer\`。\n\n### 约束条件\n- 生产者与消费者在大部分时间应处于解耦状态，避免在同一个并发容器上频繁抢锁。`,
        starterCode: `import java.util.*;\nimport java.util.concurrent.atomic.*;\n\npublic class DoubleBufferEventLogger {\n    private final int batchSize;\n    private final long flushIntervalMs;\n    private final NetworkClient networkClient;\n\n    // TODO: 定义双缓冲区及原子引用交换结构\n    \n    public interface NetworkClient {\n        void sendLogs(List<String> logs);\n    }\n\n    public DoubleBufferEventLogger(int batchSize, long flushIntervalMs, NetworkClient client) {\n        this.batchSize = batchSize;\n        this.flushIntervalMs = flushIntervalMs;\n        this.networkClient = client;\n    }\n\n    public void logEvent(String event) {\n        // TODO: 写入当前活跃的 writeBuffer，支持并发写入\n    }\n\n    public void flush() {\n        // TODO: 原子性交换缓冲区，并启动/调用发送\n    }\n}`
      },
      {
        id: 'l3',
        title: 'Level 3: 优雅关闭与零丢失保障 (Graceful Shutdown)',
        difficulty: 'HARD',
        concepts: ['Thread Interrupts', 'Lifecycle Management', '原子状态', '数据零丢失'],
        requirements: `### 关卡目标\n实现完美的优雅关闭 (\`shutdown()\`）。\n1. 调用 \`shutdown()\` 后，立刻拒绝新日志的写入（抛出异常或静默拒绝）。\n2. 唤醒并通知后台消费线程，等待其将队列中剩余的日志、以及当前本地缓冲区中积攒的日志**全部发送完毕**后，线程方可退出。\n3. 保证在进程退出前，绝对没有一条已经提交的日志被丢弃。\n\n### 约束条件\n- 不得在调用 \`shutdown()\` 时暴力 \`stop()\` 线程，必须通过中断 (\`interrupt\`) 信号，并配合状态标记完成最后一批数据的“排空”（Draining）。`,
        starterCode: `import java.util.*;\nimport java.util.concurrent.*;\nimport java.util.concurrent.atomic.*;\n\npublic class GracefulEventLogger {\n    private final int batchSize;\n    private final long flushIntervalMs;\n    private final NetworkClient networkClient;\n    \n    // TODO: 状态标记与生命周期控制变量\n\n    public interface NetworkClient {\n        void sendLogs(List<String> logs);\n    }\n\n    public GracefulEventLogger(int batchSize, long flushIntervalMs, NetworkClient client) {\n        this.batchSize = batchSize;\n        this.flushIntervalMs = flushIntervalMs;\n        this.networkClient = client;\n    }\n\n    public void logEvent(String event) {\n        // TODO: 若已关闭则拒绝；未关闭则快速写入\n    }\n\n    public void shutdown() throws InterruptedException {\n        // TODO: 停止接收新日志，唤醒工作线程，排空缓冲，并阻塞等待工作线程彻底退出\n    }\n}`
      }
    ]
  },
  {
    id: 'event-uploader',
    title: 'Event Uploader',
    subtitle: '事件并发重试上传器',
    description: '在不可靠的网络下进行批次上传。当上传失败时执行指数退避重试，并能保证严格的上传顺序。',
    levels: [
      {
        id: 'l1',
        title: 'Level 1: 生产者消费者与指数退避重试',
        difficulty: 'MEDIUM',
        concepts: ['Exponential Backoff', 'Producer-Consumer', 'Error Recovery'],
        requirements: `### 关卡目标\n设计一个 \`EventUploader\`，采用生产者-消费者模式，当消费者线程上传数据失败时，不得直接丢弃该批次，应执行**指数退避重试（Exponential Backoff Retry）**：\n- 第一次失败后，等待 100ms 重试。\n- 第二次失败后，等待 200ms 重试。\n- 第三次失败后，等待 400ms 重试。\n- 达到 3 次最大重试限制后方可放弃或报警。\n\n### 约束条件\n- 退避等待时不能阻塞其他无关线程，必须保证重试间隔的精确与非阻塞。`,
        starterCode: `import java.util.*;\n\npublic class EventUploader {\n    public interface UploaderClient {\n        void upload(List<String> batch) throws Exception;\n    }\n\n    private final UploaderClient client;\n    // TODO: 内部缓冲队列与工作线程\n\n    public EventUploader(UploaderClient client) {\n        this.client = client;\n    }\n\n    public void submitEvent(String event) {\n        // TODO: 提交事件到待上传缓冲\n    }\n\n    private void processUploadWithRetry(List<String> batch) {\n        // TODO: 执行指数退避重试的上传流程\n    }\n}`
      },
      {
        id: 'l2',
        title: 'Level 2: 严格序列号保序重试',
        difficulty: 'HARD',
        concepts: ['Sequence Control', 'Ordering Guarantees', 'Queue Re-insertion'],
        requirements: `### 关卡目标\n在分布式链路日志或者事务上报中，事件通常带有一个全局单调递增的序列号（Sequence Number）。\n如果某一小批事件上传失败进行重试，而后续的批次已经通过其他通道或线程抢先上报，就会造成数据乱序。\n本关要求：\n1. 每一个事件有唯一的 \`seq\`。\n2. 发生上传失败时，必须将该失败批次重新放回待上传队列的**最头部（Head）**，阻塞后续事件的上报，确保网络接收端收到的事件顺序与 \`seq\` 严格一致。\n\n### 约束条件\n- 即使有多个生产者并发提交日志，也必须保证最终发送到 UploaderClient 的批次在 \`seq\` 上是有序的，且一旦失败重试，整个流水线必须挂起等待重试成功，不得乱序发送。`,
        starterCode: `import java.util.*;\n\npublic class OrderedEventUploader {\n    public static class Event {\n        public final String data;\n        public final int seq;\n        public Event(String data, int seq) {\n            this.data = data;\n            this.seq = seq;\n        } \n    }\n\n    public interface UploaderClient {\n        void upload(List<Event> batch) throws Exception;\n    }\n\n    private final UploaderClient client;\n    // TODO: 定义保序队列和状态\n\n    public OrderedEventUploader(UploaderClient client) {\n        this.client = client;\n    }\n\n    public void submitEvent(Event event) {\n        // TODO: 提交带序列号的事件，保证队列内部或者发送时是有序的\n    }\n\n    // TODO: 上传逻辑，失败时保证把当前批次重新插回队头并阻塞重试\n}`
      }
    ]
  },
  {
    id: 'currency-exchanger',
    title: 'Currency Exchanger',
    subtitle: '高并发汇率图检索',
    description: '设计一个支持多线程并发查询与更新的货币汇率图。重点解决读多写少场景下的并发锁争抢问题，并保证复杂写操作的原子性。',
    levels: [
      {
        id: 'l1',
        title: 'Level 1: 读写锁 ReadWriteLock 读多写少优化',
        difficulty: 'EASY',
        concepts: ['ReentrantReadWriteLock', 'Graph Traversal', '锁降级'],
        requirements: `### 关卡目标\n维护一个图结构存放货币两两之间的汇率。用户会高频调用 \`getRate(from, to)\`（通过图的 DFS/BFS 遍历路径计算任意两种货币的汇率，例如 A->B=2, B->C=3，则 A->C=6），偶尔会调用 \`updateRate(from, to, rate)\` 更新汇率。\n请使用 \`ReentrantReadWriteLock\` 保护你的图结构，让高并发的读请求可以完全并行，而写请求独占锁。\n\n### 约束条件\n- 读锁持有时不能进行写操作，避免发生死锁。\n- 确保 DFS 遍历过程中，图结构不会被并发的写锁破坏，返回脏数据。`,
        starterCode: `import java.util.*;\nimport java.util.concurrent.locks.*;\n\npublic class CurrencyExchanger {\n    // 汇率图结构：Currency -> (Target -> Rate)\n    private final Map<String, Map<String, Double>> graph = new HashMap<>();\n    // TODO: 定义你的读写锁\n\n    public void updateRate(String source, String target, double rate) {\n        // TODO: 写锁保护更新\n    }\n\n    public double getRate(String source, String target) {\n        // TODO: 读锁保护图深度/广度遍历计算\n        return -1.0;\n    }\n}`
      },
      {
        id: 'l2',
        title: 'Level 2: ConcurrentHashMap 复合操作的原子性保障',
        difficulty: 'MEDIUM',
        concepts: ['ConcurrentHashMap', 'Lock-Free Map Updates', 'computeIfAbsent', '原子性'],
        requirements: `### 关卡目标\n高并发汇率图检索场景下，摒弃全局的读写锁，改用 \`ConcurrentHashMap\` 细粒度控制。\n更新汇率时，我们需要更新两个方向（如 A->B 设为 R，则 B->A 设为 1/R）。这包含两次 Map 写入操作。\n如果直接并发调用 \`map.put()\`，其他读线程可能会在中间状态读取到不一致的半更新数据。\n请利用 \`ConcurrentHashMap\` 的原子性复合方法（如 \`compute\`、\`computeIfAbsent\`）或者分段锁，确保双向汇率的插入/更新在其他读线程看来是完全原子的。\n\n### 约束条件\n- 严禁使用全局 synchronized 锁，必须使用细粒度的 ConcurrentHashMap 原子操作保障两步写入的最终一致性或强一致性。`,
        starterCode: `import java.util.concurrent.*;\n\npublic class AtomicExchanger {\n    // 细粒度并发 Map\n    private final ConcurrentHashMap<String, ConcurrentHashMap<String, Double>> graph = new ConcurrentHashMap<>();\n\n    public void updateRateBidirectional(String source, String target, double rate) {\n        // TODO: 实现原子的双向汇率更新，防止并发读线程看到“只有单向更新成功”的中间状态\n    }\n\n    public double getRateDirect(String source, String target) {\n        // TODO: 读取汇率\n        return -1.0;\n    }\n}`
      }
    ]
  },
  {
    id: 'operator-assigner',
    title: 'Operator Assigner',
    subtitle: '任务客服派单器',
    description: '根据客服的工作负载和空闲时间，在高并发情况下原子的将任务分配给最佳的客服，处理优先队列在状态变更时的重排挑战。',
    levels: [
      {
        id: 'l1',
        title: 'Level 1: 优先队列 PriorityQueue 并发保护',
        difficulty: 'MEDIUM',
        concepts: ['PriorityQueue', 'Mutual Exclusion', 'Reordering on mutation'],
        requirements: `### 关卡目标\n客服派单系统维护一个客服队列，依据以下规则选出最佳客服：\n1. 拥有最少当前任务数（workLoad）的客服。\n2. 任务数相同时，选择最久未被指派（lastOpTime 最小）的客服。\n3. 依然相同时，按名字字母表排序。\n\n**难点**：当指派任务给客服后，该客服的 \`workLoad\` 增加，其在 \`PriorityQueue\` 中的优先级发生了改变。但是 Java 的 \`PriorityQueue\` 只有在 \`poll()\` 或 \`add()\` 时才会调整结构，直接修改内部属性会导致队列乱序。\n请设计线程安全的派单机制，正确在修改状态时进行重排，并防止多线程争抢同一个客服。\n\n### 约束条件\n- 派单 \`assign(taskId)\` 和设置客服上限 \`setLimit()\` 必须线程安全。`,
        starterCode: `import java.util.*;\n\npublic class OperatorAssigner {\n    public static class Operator implements Comparable<Operator> {\n        public final String name;\n        public int limit;\n        public int workLoad = 0;\n        public long lastOpTime = 0;\n\n        public Operator(String name, int limit) {\n            this.name = name; \n            this.limit = limit;\n        }\n\n        @Override\n        public int compareTo(Operator o) {\n            if (this.workLoad != o.workLoad) return this.workLoad - o.workLoad;\n            if (this.lastOpTime != o.lastOpTime) return Long.compare(this.lastOpTime, o.lastOpTime);\n            return this.name.compareTo(o.name);\n        }\n    }\n\n    // TODO: 定义你的同步队列或锁\n\n    public OperatorAssigner(List<String> opNames) {\n        // TODO: 初始化\n    }\n\n    public synchronized String assign(String taskId) {\n        // TODO: 安全取出最优客服，更新其 workLoad 与 lastOpTime，并正确重排队列，最后返回客服名字\n        return null;\n    }\n\n    public synchronized void setLimit(String opName, int limit) {\n        // TODO: 安全修改客服上限并调整队列\n    }\n}`
      }
    ]
  },
  {
    id: 'alternating-printer',
    title: 'Alternating Printer',
    subtitle: '交替打印与线程协作',
    description: '通过底层线程挂起与唤醒机制，指挥多个不同的线程以严格的指定顺序交替输出字符，掌握多条件协调原语。',
    levels: [
      {
        id: 'l1',
        title: 'Level 1: wait/notify 交替打印 Zero-Even-Odd',
        difficulty: 'EASY',
        concepts: ['wait() / notifyAll()', 'Monitor Lock', 'State Variables'],
        requirements: `### 关卡目标\n实现 LeetCode 1116 的交替打印核心逻辑。\n有三个线程分别负责打印 \`0\`、奇数、偶数。如果输入数字为 n，要求输出格式如 \`01020304...0n\`。\n- \`Thread A\` 调用 \`printZero()\` 只打印 \`0\`。\n- \`Thread B\` 调用 \`printEven()\` 只打印偶数。\n- \`Thread C\` 调用 \`printOdd()\` 只打印奇数。\n请使用标准的 \`synchronized\`、\`wait()\` 和 \`notifyAll()\` 实现精确的交替控制。\n\n### 约束条件\n- 绝对不允许忙等待（Busy-Spinning），不合要求的线程必须在 wait 块中挂起，由其他线程精准唤醒。`,
        starterCode: `import java.util.function.IntConsumer;\n\npublic class ZeroEvenOdd {\n    private int n;\n    // TODO: 定义状态控制变量\n\n    public ZeroEvenOdd(int n) {\n        this.n = n;\n    }\n\n    public void zero(IntConsumer printNumber) throws InterruptedException {\n        // TODO: 控制打印 0\n    }\n\n    public void even(IntConsumer printNumber) throws InterruptedException {\n        // TODO: 控制打印偶数\n    }\n\n    public void odd(IntConsumer printNumber) throws InterruptedException {\n        // TODO: 控制打印奇数\n    }\n}`
      },
      {
        id: 'l2',
        title: 'Level 2: ReentrantLock & Condition 双条件氢氧生成器',
        difficulty: 'MEDIUM',
        concepts: ['ReentrantLock', 'Condition', 'Precise Signaling', 'Barrier Pattern'],
        requirements: `### 关卡目标\n实现 H2O 生成器（LeetCode 1117）。\n有两个线程分别产生氢气 \`H\` 和氧气 \`O\`。我们需要通过某种机制，使得任意到达的线程被阻塞，直到有两个氢线程和一个氧线程都准备就绪，此时合成一个 H2O 分子并释放它们。\n- 氢线程调用 \`hydrogen(releaseHydrogen)\`。\n- 氧线程调用 \`oxygen(releaseOxygen)\`。\n- 必须保证每合成一个 H2O 分子，\`releaseHydrogen\` 被调用 2 次，\`releaseOxygen\` 被调用 1 次，且没有多余的化学键乱序。\n请使用 \`ReentrantLock\` 配合两个 \`Condition\` (\`hCond\`, \`oCond\`) 精准挂起与互相唤醒。\n\n### 约束条件\n- 必须支持高并发线程的随机到达，且合成的化学比例始终严格为 2:1。`,
        starterCode: `import java.util.concurrent.locks.*;\n\npublic class H2O {\n    // TODO: 定义锁与 Conditions\n\n    public H2O() {\n    }\n\n    public void hydrogen(Runnable releaseHydrogen) throws InterruptedException {\n        // TODO: 挂起直至氧气足够，释放氢气，并唤醒氧气\n    }\n\n    public void oxygen(Runnable releaseOxygen) throws InterruptedException {\n        // TODO: 挂起直至氢气足够，释放氧气，并唤醒氢气\n    }\n}`
      }
    ]
  },
  {
    id: 'custom-bounded-buffer',
    title: 'Custom Bounded Buffer',
    subtitle: '自定义有界阻塞队列',
    description: '自己动手实现一个经典的 Bounded Buffer（有界环形队列），深入理解 ArrayBlockingQueue 底层的条件挂起机制，解决虚假唤醒与信号丢失。',
    levels: [
      {
        id: 'l1',
        title: 'Level 1: synchronized 监视器锁下的单条件唤醒',
        difficulty: 'EASY',
        concepts: ['synchronized', 'wait()', 'notifyAll()', 'Spurious Wakeups'],
        requirements: `### 关卡目标\n实现一个固定容量的阻塞队列 \`MyBoundedBuffer\`，提供 \`put(x)\`（若队列满则阻塞）和 \`take()\`（若队列空则阻塞）操作。\n本关卡要求：\n1. 使用 \`synchronized\`、\`wait()\` 和 \`notifyAll()\` 实现。\n2. 内部使用环形数组 (\`Object[]\`) 避免垃圾回收开销。\n3. 必须在 \`while\` 循环中进行条件判断以预防**虚假唤醒 (Spurious Wakeup)**。\n\n### 约束条件\n- 满队列写入和空队列读取必须正确挂起，并在对应条件满足时被唤醒。`,
        starterCode: `public class MyBoundedBuffer<T> {\n    private final Object[] items;\n    private int head = 0, tail = 0, count = 0;\n\n    public MyBoundedBuffer(int capacity) {\n        this.items = new Object[capacity];\n    }\n\n    public synchronized void put(T x) throws InterruptedException {\n        // TODO: 循环判断队列是否已满，挂起，写入环形数组，唤醒其他线程\n    }\n\n    @SuppressWarnings("unchecked")\n    public synchronized T take() throws InterruptedException {\n        // TODO: 循环判断队列是否为空，挂起，从环形数组取出，唤醒其他线程\n        return null;\n    }\n}`
      },
      {
        id: 'l2',
        title: 'Level 2: ReentrantLock 双条件 Condition 精准唤醒优化',
        difficulty: 'MEDIUM',
        concepts: ['ReentrantLock', 'Condition', 'Wakeup Storm', '性能优化'],
        requirements: `### 关卡目标\n在 Level 1 中，使用对象锁和 \`notifyAll()\`。当队列中有多个生产者和多个消费者时，调用 \`notifyAll()\` 会唤醒**所有**等待的线程。但这会引发**唤醒风暴 (Wakeup Storm)**，极大浪费 CPU。\n请使用 \`ReentrantLock\` 并创建两个独立的 \`Condition\`：\n- \`notFull\`（挂起等待队列有空位的生产者）\n- \`notEmpty\`（挂起等待队列有数据的消费者）\n进行精准的单线唤醒 (\`signal()\`）优化。\n\n### 约束条件\n- 生产者只能唤醒等待的消费者，消费者只能唤醒等待的生产者，杜绝无效的多余线程唤醒。`,
        starterCode: `import java.util.concurrent.locks.*;\n\npublic class OptimizedBoundedBuffer<T> {\n    private final Object[] items;\n    private int head = 0, tail = 0, count = 0;\n    \n    // TODO: 定义 ReentrantLock 及其双条件 Condition\n\n    public OptimizedBoundedBuffer(int capacity) {\n        this.items = new Object[capacity];\n    }\n\n    public void put(T x) throws InterruptedException {\n        // TODO: 使用 Lock 和 notFull.await() 进行阻塞，写入后调用 notEmpty.signal()\n    }\n\n    @SuppressWarnings("unchecked")\n    public T take() throws InterruptedException {\n        // TODO: 使用 Lock 和 notEmpty.await() 进行阻塞，取出后调用 notFull.signal()\n        return null;\n    }\n}`
      }
    ]
  },
  {
    id: 'concurrent-lru-cache',
    title: 'Concurrent LRU Cache',
    subtitle: '高并发 LRU 缓存',
    description: '设计一个支持高并发读写的 LRU 缓存。解决传统 LinkedHashMap 线程安全锁粒度过粗的问题，设计高性能的读写分离重构方案。',
    levels: [
      {
        id: 'l1',
        title: 'Level 1: LinkedHashMap 装饰监视器锁',
        difficulty: 'EASY',
        concepts: ['LinkedHashMap', 'Collections.synchronizedMap', 'LRU Eviction'],
        requirements: `### 关卡目标\n实现一个最基础的有界 LRU 缓存。使用 Java 内置的 \`LinkedHashMap\`，通过重写 \`removeEldestEntry()\` 并进行同步锁装饰，支持基本的线程安全和按最近最少使用淘汰。\n\n### 约束条件\n- 缓存容量有限，当插入新数据导致超出容量时，必须淘汰最久未被使用的数据。`,
        starterCode: `import java.util.*;\n\npublic class BasicLruCache<K, V> {\n    private final int capacity;\n    // TODO: 定义底层装配\n\n    public BasicLruCache(int capacity) {\n        this.capacity = capacity;\n    }\n\n    public synchronized V get(K key) {\n        // TODO: 读取并更新使用顺序\n        return null;\n    }\n\n    public synchronized void put(K key, V value) {\n        // TODO: 写入并淘汰超限数据\n    }\n}`
      },
      {
        id: 'l2',
        title: 'Level 2: 读写分离无争抢 Concurrent LRU 设计',
        difficulty: 'HARD',
        concepts: ['ConcurrentHashMap', 'ConcurrentLinkedQueue', 'Read-Write Separation', '性能拆分'],
        requirements: `### 关卡目标\n在 Level 1 中，哪怕是只读的 \`get()\` 操作，也必须获取全局排他锁，这在读多写少的高并发下性能极差。\n请设计一个高并发的 LRU 缓存：\n1. 使用 \`ConcurrentHashMap\` 实现 $O(1)$ 的并发数据检索。\n2. 避免在读命中（Read Hit）时获取写锁。可以使用一个并发无锁队列（如 \`ConcurrentLinkedQueue\`）去异步或分段排队“节点读取事件”，或者使用分段锁控制链表调整。\n3. 允许高吞吐的并发读，将排他锁的范围限制在极小的淘汰和写操作上。\n\n### 约束条件\n- 读操作在绝大部分情况下应完全并发，不能阻塞彼此。`,
        starterCode: `import java.util.concurrent.*;\n\npublic class ConcurrentLruCache<K, V> {\n    private final int capacity;\n    // TODO: 细粒度并发结构（如 ConcurrentHashMap，并发队列等）\n\n    public ConcurrentLruCache(int capacity) {\n        this.capacity = capacity;\n    }\n\n    public V get(K key) {\n        // TODO: 高并发无锁读取，仅在后台异步或原子标记热度，避免全局阻塞\n        return null;\n    }\n\n    public void put(K key, V value) {\n        // TODO: 细粒度同步写，且当超出容量时安全执行淘汰\n    }\n}`
      }
    ]
  },
  {
    id: 'token-bucket-rate-limiter',
    title: 'Token Bucket Rate Limiter',
    subtitle: '高并发令牌桶限流器',
    description: '实现一个限制接口调用频率的令牌桶。通过时间差值进行懒补充，并在高级关卡中挑战完全无锁的 CAS 性能实现。',
    levels: [
      {
        id: 'l1',
        title: 'Level 1: 锁同步与时间差（Time-Delta）令牌懒补充',
        difficulty: 'MEDIUM',
        concepts: ['Token Bucket', 'Synchronization', 'Time Delta Refills', '锁同步'],
        requirements: `### 关卡目标\n实现一个令牌桶限流器 \`TokenBucketLimiter\`：\n1. 构造参数包括最大令牌容量 \`capacity\`，和每秒产生令牌数 \`refillRatePerSecond\`。\n2. 业务线程调用 \`allowRequest()\` 判断是否允许通过（即消耗一个令牌）。\n3. **难点**：不需要启动一个多余的后台线程定时往桶里放令牌。而是在每次有请求到达时，**根据当前时间与上次请求时间的时间差**，懒计算（Lazy Calculate）出应该补充的令牌数，累加进桶里（不超过最大容量）。\n\n### 约束条件\n- 必须使用锁或同步块保证时间更新与令牌扣减操作 the overall atomicity.`,
        starterCode: `public class TokenBucketLimiter {\n    private final long capacity;\n    private final double refillRatePerSecond;\n    \n    // TODO: 令牌数、上次刷新时间等变量\n\n    public TokenBucketLimiter(long capacity, double refillRatePerSecond) {\n        this.capacity = capacity;\n        this.refillRatePerSecond = refillRatePerSecond;\n    }\n\n    public synchronized boolean allowRequest() {\n        // TODO: 获取当前时间，计算并累加这一时间段产生的令牌，扣减令牌，返回是否成功通过\n        return false;\n    }\n}`
      },
      {
        id: 'l2',
        title: 'Level 2: 完全无锁的 CAS 原子令牌扣减',
        difficulty: 'HARD',
        concepts: ['CAS', 'AtomicReference', 'Lock-Free Rate Limiter', '自旋重试'],
        requirements: `### 关卡目标\n在高并发请求冲击网关时，\`synchronized allowRequest()\` 会导致网关入口处严重阻塞。\n请重构限流器，消除所有同步锁 (\`synchronized\`, \`Lock\`)，实现**完全无锁（Lock-Free）**的并发限流器。\n- 提示：定义一个只读的 Immutable 状态类 \`BucketState\` 保存当前令牌数和刷新时间。\n- 使用 \`AtomicReference<BucketState>\` 管理状态。\n- 通过 CAS 自旋循环（\`compareAndSet\`），在无锁的情况下原子的进行时间补充和令牌扣减。\n\n### 约束条件\n- 绝对不允许使用排他锁，所有竞争失败的线程必须通过 CAS 循环进行自旋重试直到状态成功转移。`,
        starterCode: `import java.util.concurrent.atomic.AtomicReference;\n\npublic class LockFreeTokenLimiter {\n    private final long capacity;\n    private final double refillRatePerSecond;\n\n    // 状态 Immutable 包装\n    private static class BucketState {\n        final double tokens;\n        final long lastRefillTime;\n        BucketState(double tokens, long lastRefillTime) {\n            this.tokens = tokens;\n            this.lastRefillTime = lastRefillTime;\n        } \n    }\n\n    // TODO: 定义状态原子引用\n\n    public LockFreeTokenLimiter(long capacity, double refillRatePerSecond) {\n        this.capacity = capacity;\n        this.refillRatePerSecond = refillRatePerSecond;\n    }\n\n    public boolean allowRequest() {\n        // TODO: 执行 CAS 自旋循环，读取状态，根据时间差增补令牌，判定并原子的 CAS 更新状态\n        return false;\n    }\n}`
      }
    ]
  }
];
