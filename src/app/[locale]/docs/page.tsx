"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentLocale } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Layers,
  Code,
  Terminal,
  ShieldCheck,
  Award,
  Database,
  Cpu,
  RefreshCw,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  Menu
} from "lucide-react";

// ============================================================================
// CHAPTERS & SUB-TOPICS DETAILED TEXT CONFIGURATIONS (ISOLATED TO PREVENT TSX CONFLICTS)
// ============================================================================

interface TopicContent {
  title: string;
  subtitle: string;
  markdown: string;
}

interface Chapter {
  id: string;
  title: string;
  icon: any;
  topics: { [key: string]: TopicContent };
}

const DOCUMENTATION_DATA: { [key: string]: Chapter } = {
  "framework-render": {
    id: "framework-render",
    title: "Chapter 1: 前端框架与渲染层 (FE Framework & Rendering)",
    icon: Code,
    topics: {
      "nextjs-rsc": {
        title: "1.1 Next.js 15 App Router & RSC vs RCC 边界控制",
        subtitle: "服务端渲染与客户端交互边界的架构设计",
        markdown: `### Next.js 15 App Router 架构规范

Next.js 15 App Router 改变了 React 应用的传统生命周期，将组件默认归为 **React Server Components (RSC)**，并在需要时通过 \`"use client"\` 显式下放到 **React Client Components (RCC)**。

#### 1. RSC (Server Component) 的优势与职责
- **数据预取与安全性**：RSC 直接运行在 Node.js 服务端，可以直接安全地调用微服务或读取数据库，不需要向浏览器暴露敏感 API 密钥或配置。
- **打包体积优化 (Zero Bundle Size)**：RSC 的依赖包（例如 Markdown 解析器、大型时间格式化库）直接在服务端解析并转换为 HTML，其依赖不会打包发送至客户端，极大地减小了 First Load JS 的体积。
- **SEO & 首次渲染提升**：服务端直接渲染出语义化 HTML，有利于搜素引擎爬取，并大幅提升了首次内容渲染时间 (FCP)。

#### 2. RCC (Client Component) 的定位与数据流
- **浏览器 API 依赖**：任何涉及 React State (\`useState\`, \`useReducer\`)、Hooks (\`useEffect\`, \`useLayoutEffect\`)、人机交互（如 \`onClick\`）以及浏览器特有对象（\`window\`, \`localStorage\`, \`Audio\`, \`Notification\`) 的组件，都必须加上 \`"use client"\` 转换为 RCC。
- **客户端水合 (Hydration)**：RCC 会先在服务端预渲染为 HTML，随后在浏览器端加载 JS 执行“水合”以绑定事件监听。

#### 3. 边界划分策略 (RSC -> RCC)
在 FlashFlow 中，我们将路由架构设计为**“RSC 静态布局外壳 + RCC 状态编排内核”**：
- **布局外壳 (RSC)**：\`src/app/[locale]/layout.tsx\` 作为 RSC，负责动态读取多语言配置、拼装头部 Metadata，并将布局组件发送至客户端。
- **逻辑内核 (RCC)**：因为卡片复习、番茄计时器和任务编辑高度依赖 React Context 和状态变化，这些主页面组件（如 \`TasksClient.tsx\`）通过 \`"use client"\` 标记，承载客户端状态。`
      },
      "react-concurrent": {
        title: "1.2 React 18 Concurrency & Fiber 状态协调",
        subtitle: "并发渲染架构、React Hooks 状态机制解析",
        markdown: `### React 18 Concurrency 与 Fiber 调和引擎

React 18 引入了**并发渲染（Concurrent Rendering）**，底层依托 Fiber 架构实现可中断的渲染管线。

#### 1. Fiber 调和机制 (Fiber Reconciliation)
- **可分片的工作单元**：旧的 React (v15及以下) 采用递归同步调和，一旦渲染开始便无法中断，若组件树庞大会导致主线程卡顿（丢帧）。Fiber 将组件渲染拆分为独立的小任务片，支持优先级调度。
- **双缓冲技术 (Double Buffering)**：React 在内存中构建新的 Fiber 树（WorkInProgress Tree），渲染完成后一次性提交并替换当前的视图树（Current Tree），杜绝了渲染过程中的页面闪烁。

#### 2. 状态机制与 Hooks 运行原理解析
- **React Context 状态透传**：
  \`FlashcardsContext\`、\`PomodoroContext\` 等利用 React Context 机制，在顶层维护状态树，底层订阅组件在 Context 值发生变化时，会触发虚拟 DOM 树的比对（Reconciliation）。为了避免不必要的全量重新渲染，我们在组件层使用了高精度的逻辑拆分或 \`useMemo\`。
- **React 常用 Hooks 规范**：
  - \`useMemo\`：缓存耗时的派生计算（例如：今天待复习卡片的筛选与排序）。
  - \`useCallback\`：缓存事件处理器，防止父组件重绘时子组件（如 \`Button\`）因接收到新的函数引用而无意义地重复渲染。`
      },
      "i18n-routing": {
        title: "1.3 多语言国际化（i18n）与中间件路由过滤",
        subtitle: "基于 next-international 与 Next.js Middleware 的路由劫持",
        markdown: `### i18n 路由设计与 Middleware 匹配机制

FlashFlow 采用 \`next-international\` 库实现强类型、高性能的多语言翻译支持。

#### 1. 动态路由结构
所有的页面路由均包裹在 \`src/app/[locale]\` 目录下，使 URL 自然呈现为 \`/en/tasks\` 或 \`/zh/timer\`，以提供对多语言 SEO 的天然支持。

#### 2. 国际化中间件 (middleware.ts)
为了实现无缝的语言转换，我们配置了 Next.js \`middleware.ts\`：
- 当用户访问根路径 \`/\` 时，中间件会读取浏览器的 \`Accept-Language\` 报头或客户端的 \`Next-Locale\` Cookie。
- 中间件随后将请求重写至对应的语言分支，如 \`/zh\`。
- 为了避免中间件干扰静态资源，需要配置过滤器（matcher）。我们使用了排除过滤正则：\`/((?!api|_next/static|_next/image|healthz|.*\\..*).*)\`，该规则能完全排除带有后缀的静态资源（如 \`/file.svg\`），防止 404 重写错误。`
      }
    }
  },
  "state-optimistic": {
    id: "state-optimistic",
    title: "Chapter 2: 前端状态管理与乐观更新 (State Management)",
    icon: Layers,
    topics: {
      "context-arch": {
        title: "2.1 前端全局 Contexts 编排架构",
        subtitle: "多 Context 划分与跨域状态总线设计",
        markdown: `### 全局 React Context 状态编排

前端应用层将状态分为 4 个限界上下文，以保证数据流的单一职责：

#### 1. AuthContext
负责封装 Firebase Client SDK。订阅 \`onAuthStateChanged\` 钩子，向下分发当前登录的 \`user\` 状态、\`loading\` 标记，并向 API 客户端提供 \`getIdToken()\` 动态刷新接口。

#### 2. FlashcardsContext
核心数据缓存层。存储用户的所有 \`flashcards\`、\`decks\`、\`tasks\` 和 \`overviews\` 数组。它承担了 CRUD 操作的数据上报和本地 UI 同步更新，是本地域视图模型 (View-Model) 的实际载体。

#### 3. PomodoroContext
与后端保持高度同步的番茄钟全局状态。保存当前专注任务 \`activeTaskId\`、倒计时状态 \`isRunning\`、以及下发的服务器心跳配置。

#### 4. PomodoroLocalContext
纯本地高精倒计时 Context。它继承了 PomodoroContext，但在本地提供不依赖网络的心跳倒计时驱动，是系统离线高可用的核心沙箱。`
      },
      "optimistic-rollback": {
        title: "2.2 乐观更新 (Optimistic UI) 与状态回滚机制",
        subtitle: "极致流畅的交互与异常回滚的闭环实现",
        markdown: `### 乐观 UI 更新与异常回滚设计

为消除网络网络延迟对客户端操作带来的阻塞感，系统采用了“先变更、后上报、异常回滚”的乐观 UI 机制。

#### 核心实现代码
\`\`\`typescript
const deleteFlashcard = async (cardId: string): Promise<boolean> => {
  // 1. 获取当前状态的拷贝，用于网络异常时执行回滚状态重置
  const rollbackBackup = [...flashcards];

  // 2. 乐观更新：本地状态直接将目标卡片剔除，触发 UI 刷新（响应时间 0ms）
  setFlashcards((prev) => prev.filter((card) => card.id !== cardId));

  try {
    // 3. 后台异步向 NestJS BFF 发起物理删除请求
    const response = await apiClient.delete(\`/flashcards/\${cardId}\`);
    if (!response.success) {
      throw new Error("API transaction returned failed status");
    }
    return true;
  } catch (error) {
    // 4. 当网络超时或服务端抛出 500 时，立刻回滚本地状态至之前的镜像
    setFlashcards(rollbackBackup);
    console.error("Optimistic Update failed. Rolling back...", error);
    showToast("Failed to delete card due to network issues", "destructive");
    return false;
  }
};
\`\`\`

#### 一致性取舍
乐观更新基于“绝大多数网络请求最终都会成功”的假设。它优先保障视觉一致性（Visual Consistency），而通过回滚处理（Rollback）达成数据的最终一致性（Eventual Consistency），提供了极为丝滑的本地响应性能。`
      },
      "sandbox-timer": {
        title: "2.3 本地离线高精倒计时沙箱机制",
        subtitle: "基于浏览器原生 API 的高精计时器设计",
        markdown: `### 本地倒计时沙箱设计

为了防止客户端切入后台、手机休眠或断网导致番茄钟倒计时挂起，我们设计了离线沙箱计时器：

#### 1. 为什么不能依赖服务器计时？
因为服务器网络通信存在延迟和网络中断风险。如果在服务端计时并每秒下发，会导致大量无意义网络传输，且网络一抖动，客户端倒计时就会卡死。

#### 2. 本地高精倒计时实现
我们基于 React 本地 Context，借助 JS 内置的 \`setInterval\` 结合物理时间校验（\`new Date().getTime()\` 与服务端下发的 \`targetEndTime\` 取时间差值）来驱动。
这样，不管客户端如何切后台或休眠，每次组件重新唤醒时，都会自动读取真实物理时间差值并重新水合，确保时间的一致性与绝对精准。`
      }
    }
  },
  "pwa-offline": {
    id: "pwa-offline",
    title: "Chapter 3: PWA 离线高可用与服务工作协程 (PWA & Offline)",
    icon: RefreshCw,
    topics: {
      "sw-lifecycle": {
        title: "3.1 Service Worker 生命周期与拦截劫持",
        subtitle: "安装、激活与 Fetch 阶段的运行机制分析",
        markdown: `### Service Worker 生命周期剖析

Service Worker 是一种独立于网页主线程运行的后台脚本，是 PWA 离线运行的底层基石。

#### 1. 注册 (Registration)
在页面主线程加载完成后，通过 \`navigator.serviceWorker.register('/sw.js')\` 注册。

#### 2. 安装 (Installation)
Service Worker 触发 \`install\` 事件。在这个阶段，Workbox 会解析构建生成的静态文件列表，并将它们下载存入 Cache Storage 缓存区。

#### 3. 激活 (Activation)
安装成功后进入激活阶段。此时会清理旧版本的缓存数据，保证新版本资源可被正常命中。

#### 4. 劫持拦截 (Fetch Interception)
激活后，Service Worker 会充当本地代理服务器，拦截页面发出的所有网络请求（\`fetch\` 事件），并依据缓存策略决定是从缓存中直接返回数据，还是通过网络请求获取。`
      },
      "caching-strategies": {
        title: "3.2 Workbox 缓存策略：CacheFirst 与 NetworkFirst",
        subtitle: "针对不同资源类型的缓存优化方案",
        markdown: `### Workbox 缓存策略规范

FlashFlow 采用 \`@ducanh2912/next-pwa\` 插件控制资源缓存策略，对不同资源使用不同的 Workbox 策略：

#### 1. CacheFirst (缓存优先)
- **适用资源**：字体文件、打包后带 Hash 的 JS / CSS、中英文 JSON 语言包。
- **机制**：优先读取本地缓存，命中则立刻返回，不发起任何网络请求。仅在缓存未命中时才请求网络并缓存结果。

#### 2. NetworkFirst (网络优先)
- **适用资源**：BFF \`/api\` 接口数据。
- **机制**：优先发起网络请求获取最新数据；若网络连接超时或处于断网状态，自动读取 Cache 空间中的备份数据返回，保障应用在离线时能读出最近一次的卡片数据。

#### 3. StaleWhileRevalidate (对比重水合)
- **适用资源**：经常更新但要求秒开的静态资产（如 logo、svg 资源）。
- **机制**：直接返回缓存，同时在后台发起请求获取新数据并更新缓存，使下一次访问可以使用最新资源。`
      },
      "manifest-pwa": {
        title: "3.3 PWA 配置文件与离线测试规范",
        subtitle: "manifest.json 配置核对与打包测试流程",
        markdown: `### PWA 配置规范与生产级调试

#### 1. manifest.json 关键配置
PWA 能够被移动端/桌面浏览器“安装”并作为独立 App 运行，全靠 \`public/manifest.json\`：
- \`start_url\`：设置 App 启动路径，通常为 \`/\`。
- \`display\`：设为 \`standalone\` 以隐藏浏览器地址栏与导航按钮。
- \`icons\`：必须配置多套尺寸（如 192x192, 512x512）以适配不同设备的主屏幕图标。

#### 2. 开发环境隔离建议
在开发 Next.js 应用时，频繁的 HMR 编译生成临时文件，如果启用了 Service Worker 缓存，会导致本地代码改动无法及时显现，或引起 webpack 异步块加载异常。
因此，我们在 \`next-config.ts\` 中配置了 \`disable: process.env.NODE_ENV === 'development'\`，仅在生产环境打包时编译 SW。如果要测试 PWA 离线功能，请在本地运行 \`npm run build && npm run start\`。`
      }
    }
  },
  "backend-ioc": {
    id: "backend-ioc",
    title: "Chapter 4: 后端核心架构与 IoC 容器 (Backend Framework & IoC)",
    icon: Terminal,
    topics: {
      "nestjs-modular": {
        title: "4.1 NestJS 模块化切分与 Controller-Service 模式",
        subtitle: "高内聚限界上下文划分与依赖解耦",
        markdown: `### NestJS 模块化设计规范

后端基于 NestJS 框架开发，采用高度解耦的模块化（Modular）结构：

#### 1. 限界上下文切分 (Bounded Contexts)
我们为不同的业务域建立了专门的 Module：
- \`FlashcardsModule\`：卡片创建、删除、编辑。
- \`DecksModule\`：卡片集管理及事务性级联清理。
- \`TasksModule\`：任务的创建、状态更新与 Check-in 调度。
- \`PomodoroModule\`：云端番茄计时状态上报。
- \`AiModule\`：AI 卡片自动分解与代码复习生成。
每个 Module 管理自己的 Controller 和 Service，高内聚且易于测试。

#### 2. Controller-Service 经典职责划分
- **Controller 层**：负责 HTTP 通信。它映射网络路由、提取 Request/Response 报头、反序列化 Body 并拦截基础格式错误，不承载任何实际业务逻辑。
- **Service 层**：负责应用服务逻辑。它与 Firestore 数据库交互、组织数据流、进行算法运算（如 SM-2 运算）或触发 AI 调用，是纯净的业务逻辑载体。`
      },
      "ioc-di": {
        title: "4.2 控制反转 (IoC) 与依赖注入 (DI) 的底层机制",
        subtitle: "服务实例生命周期与依赖关系治理",
        markdown: `### 控制反转 (IoC) 与依赖注入 (DI)

NestJS 底层依靠 IoC 容器管理各个组件之间的依赖关系。

#### 1. 控制反转 (Inversion of Control)
传统开发中，如果 \`DecksController\` 依赖 \`DecksService\`，需要手动编写 \`new DecksService()\`。当服务依赖变多时，实例的初始化顺序会变得极难管理。在 NestJS 中，控制权交给了框架 IoC 容器，由其在系统启动时解析依赖并自动注入。

#### 2. 依赖注入 (Dependency Injection)
我们在类构造器中声明所需的依赖：
\`\`\`typescript
@Injectable()
export class DecksController {
  constructor(private readonly decksService: DecksService) {}
}
\`\`\`
NestJS 启动时，分析构造器参数的元数据，实例化 \`DecksService\`，并将其注入到 \`DecksController\` 中。

#### 3. Provider 作用域生命周期 (Scopes)
默认情况下，所有 Providers 均为**单例作用域（Singleton Scope）**。整个应用共享同一个服务实例，大幅节省了内存消耗并提升了运行效率。对于需要根据请求隔离上下文的场景，也可采用 \`Request Scope\` 或 \`Transient Scope\`。`
      },
      "config-env": {
        title: "4.3 配置管理与多环境环境变量校验",
        subtitle: "基于 ConfigModule 的配置集成",
        markdown: `### 服务端多环境配置管理

后端服务依赖外部密钥（Firebase service account、Gemini API Key）。为了安全发布，我们使用 \`@nestjs/config\` 模块进行统一配置：

#### 1. 环境变量集中管理
通过 \`ConfigModule.forRoot()\` 自动加载根目录下的 \`.env\` 配置文件，并在 NestJS 各个服务中通过 <code>configService.get('KEY')</code> 统一获取，规避了直接调用 \`process.env\` 带来的全局变量割裂。

#### 2. 校验与安全最佳实践
- 绝对不要在 Git 仓库中提交真实的 \`.env\` 配置文件，仅提交包含占位符的 \`.env.example\` 作为架构说明。
- 在生产部署（如 Vercel）时，将配置作为环境变量注入，既防止了密钥泄漏，也方便在不同发布环境（Dev / Staging / Production）之间切换配置。`
      }
    }
  },
  "backend-pipeline": {
    id: "backend-pipeline",
    title: "Chapter 5: 服务端请求管线与异常过滤 (Request Pipeline)",
    icon: Layers,
    topics: {
      "pipeline-flow": {
        title: "5.1 请求生命周期核心切面执行顺序",
        subtitle: "中间件、守卫、拦截器与过滤器管线设计",
        markdown: `### NestJS 请求管线生命周期

每一个发往 NestJS 接口的 HTTP 请求都会遵循以下严密的过滤通道，这使得公共校验逻辑无需分散在业务层：

#### 核心处理顺序
\`\`\`text
HTTP Request ──► [Middleware] ──► [Guards] ──► [Interceptors (Pre)] ──► [Pipes] ──► [Controller Handler] ──► [Interceptors (Post)] ──► [Exception Filters] ──► Response
\`\`\`

1. **Middleware (中间件)**：最先被执行。用于全局请求日志记录、跨域解析或 Cookie 处理。
2. **Guards (守卫)**：判定请求是否有权继续执行（如 \`AuthGuard\` 验证 Bearer Token），若不符合直接阻断。
3. **Interceptors (前置拦截器)**：用于在方法执行前计算耗时、缓存请求或进行权限二次分配。
4. **Pipes (管道)**：在控制器接收参数前，校验参数类型并进行格式转换（如 DTO 数据强验证）。
5. **Controller & Service**：核心业务计算处理。
6. **Interceptors (后置拦截器)**：格式化出参 JSON，将非标准数据归一化。
7. **Exception Filters (异常过滤器)**：捕获处理过程中抛出的任意异常，转化为统一的 JSON 错误响应体发送给客户端。`
      },
      "validation-pipe": {
        title: "5.2 基于 Pipes 与 DTO 的运行时数据约束验证",
        subtitle: "class-validator 与 class-transformer 强类型转换",
        markdown: `### 运行时强类型数据验证

TypeScript 仅提供编译期类型检查，编译为 JavaScript 后所有的类型限制都会消失。如果客户端提交包含非法或畸形字段的 JSON，会在逻辑运行期引发各种未定义异常。

#### 1. class-validator 装饰器校验
我们为所有的请求 Body 建立了强类型 DTO，并通过装饰器声明了属性规则：
\`\`\`typescript
import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsOptional()
  @IsString()
  readonly notes?: string;
}
\`\`\`

#### 2. ValidationPipe 运行时管道拦截
在 \`main.ts\` 中，我们全局注册了 \`ValidationPipe\`。
每当控制器接收 DTO 参数时，管道会自动对入参 JSON 进行反射验证。一旦发现类似 \`title\` 缺失或类型为数字的情况，管道会立刻阻断请求并响应 \`400 Bad Request\`，彻底将非法数据隔绝在业务 Controller 外。`
      },
      "exception-filter": {
        title: "5.3 全局异常过滤器与数据归一化序列化",
        subtitle: "Exception Filters 编写与日期数据格式化",
        markdown: `### 统一错误处理与数据格式归一化

#### 1. 全局异常过滤器 (HttpExceptionFilter)
如果在 Service 中抛出了异常（如 \`NotFoundException('Deck not found')\`），若不进行拦截，NestJS 会返回框架默认的 HTML 报错。
我们配置了全局的 \`ExceptionFilter\`，拦截所有抛出的 \`HttpException\`，格式化为包含时间戳、状态码、错误路径和清晰原因的统一 JSON：
\`\`\`json
{
  "statusCode": 404,
  "timestamp": "2026-06-08T14:48:45.000Z",
  "path": "/api/decks/123",
  "message": "Target deck not found"
}
\`\`\`

#### 2. 时间戳序列化拦截器 (Serialization Interceptor)
NoSQL 数据库 Firestore 内部使用的是专门的 \`Timestamp\` 对象，在直接返回给客户端时，无法被 JS 进行 JSON 反序列化。
因此，后端内置了序列化管道，在响应发送前，自动遍历出参数据，将所有 Firestore \`Timestamp\` 字段调用 \`.toDate().toISOString()\` 转换为规范的 ISO-8601 时间戳字符串，保证前台消费该数据时不会发生 runtime 报错。`
      }
    }
  },
  "auth-security": {
    id: "auth-security",
    title: "Chapter 6: Firebase 鉴权安全与防越权设计 (Auth & Security)",
    icon: ShieldCheck,
    topics: {
      "jwt-structure": {
        title: "6.1 Firebase JWT 令牌数据结构与签发机制",
        subtitle: "Header, Payload 与 Signature 的构成与短时令牌",
        markdown: `### Firebase JWT ID Token 技术架构

认证链路使用符合 OAuth 2.0 / OIDC 规范的 JSON Web Token (JWT) 进行网络会话管理。

#### 1. JWT 的三部分结构
Firebase ID Token 是一串经过 Base64URL 编码的字符串，以点号（.）分隔为三部分：
- **Header (头部)**：声明加密算法（通常为 RS256，即带 SHA-256 的 RSA 签名）以及密钥 ID (\`kid\`)。
- **Payload (负载)**：存储该用户的安全声明，包含 Issuer (\`iss\`)、Audience (\`aud\`，为 Firebase 项目 ID)、Expiration (\`exp\`)、数字指纹以及被信任的 \`uid\` 和 \`email\`。
- **Signature (签名)**：根据 Header 和 Payload 拼接后，使用私钥计算出的数字签名，用于防篡改。

#### 2. 短期有效令牌 (Short-lived Token)
Firebase ID Token 的默认有效期仅为 **1小时**。这种短时设计确保了即使 Token 不幸泄露，攻击者拥有的特权也会很快自然失效。前端通过 Firebase SDK 会在后台静默自动刷新 Token，从而向 API Client 提供持续有效的 Bearer 令牌。`
      },
      "signature-verification": {
        title: "6.2 非对称加密数字证书解密验证与 LRU 缓存",
        subtitle: "verifyIdToken 的底层签名解密数学原理与证书缓存",
        markdown: `### 服务端非对称加密签名校验

NestJS 后端通过 \`verifyIdToken()\` 验证令牌。这其中包含一套严密的密码学校验流：

#### 1. 签名解密校验机制 (Asymmetric Decryption)
- 谷歌在 Firebase Auth 中使用的是**非对称加密算法**。Firebase 认证服务器持有 RSA **私钥（Private Key）**签署 Token。
- 我们的 NestJS API 服务仅需使用 Google 公布的 **公钥（Public Key）** 来解密数字签名。由于公钥是完全公开的，后端不需要存储任何 Firebase 登录密码或根密钥。
- 如果解密出的数字指纹与 Payload 拼接计算得到的哈希值完全一致，则说明该 Token 是由官方签发，且在网络中未经任何篡改。

#### 2. 公钥动态拉取与本地 LRU 缓存
谷歌的公开证书公钥会定期轮换（Rotation）。后端 Firebase Admin SDK 在验签时，会根据 Token Header 中的 \`kid\`，动态向 Google 证书接口发起 HTTPS 请求获取公钥。
为了避免每次 API 请求都发起一次慢速的外部网络请求，SDK 内部维护了一个高性能的 **LRU (Least Recently Used) 缓存**。公钥拉取后会缓存至内存中，仅在过期或 \`kid\` 轮换时重新拉取，确保了单次 API 鉴权的网络耗时可忽略不计。`
      },
      "idor-prevention": {
        title: "6.3 物理隔离路径设计与 IDOR 水平越权防御",
        subtitle: "后端 UID 隔离机制与权限审查规范",
        markdown: `### 防止水平越权（IDOR）的物理路径隔离

在多用户 SaaS 或个人数据管理系统中，**水平越权（Insecure Direct Object Reference, IDOR）**是最常见的高危漏洞。

#### 1. 什么是越权漏洞？
如果后端 API 设计为 <code>GET /api/flashcards?userId=123</code>，虽然方便了调试，但黑客可以通过篡改参数直接请求 <code>/api/flashcards?userId=456</code>，窃取其他用户的数据。

#### 2. FlashFlow 物理路径强隔离设计
我们从架构设计层面上杜绝了这一隐患：
- **废弃 userId 入参**：Controller 接口中不允许传入客户端指定的 \`userId\` 或 \`uid\` 参数。
- **只信任 JWT 解析出的 UID**：在 <code>AuthGuard</code> 验签通过后，可信的 \`uid\` 会直接绑定在 \`request.user.uid\` 上。
- **硬编码数据读取路径**：后端在向 Firestore 查询卡片数据时，查询路径强制硬编码为 \`users/\${request.user.uid}/flashcards\`。因为 \`uid\` 是通过数字签名解析出且无法伪造的，攻击者修改任何参数都无法跨越用户命名空间，从底层逻辑上提供了物理安全保证。`
      }
    }
  },
  "firestore-db": {
    id: "firestore-db",
    title: "Chapter 7: Firestore 数据库系统设计 (Firestore Database)",
    icon: Database,
    topics: {
      "collection-design": {
        title: "7.1 Firestore 子集合架构与用户隔离数据模型",
        subtitle: "NoSQL 树状文档路径设计规范",
        markdown: `### NoSQL Firestore 树状架构设计

Google Firestore 是一种高性能的 NoSQL 文档数据库。它采用 **Collection（集合） -> Document（文档） -> Subcollection（子集合）** 的树状嵌套数据模型。

#### 1. 用户沙箱数据模型
在 FlashFlow 中，我们将所有用户级别的数据以子集合（Subcollections）的形式进行物理层面的父子关系绑定：
\`\`\`text
/users
  └── /{uid} (用户主文档)
        ├── /decks
        │     └── /{deckId} (卡片集文档)
        ├── /flashcards
        │     └── /{cardId} (卡片文档，内含 deckId 关联字段)
        ├── /tasks
        │     └── /{taskId} (专注任务文档)
        └── /pomodoro
              └── /state (当前用户的番茄钟即时状态)
\`\`\`

#### 2. 子集合模型的架构优势
- **天然的物理分区**：不同用户的数据文件彼此隔离，查询某一用户下的卡片仅需在 <code>users/{uid}/flashcards</code> 内进行局部检索，极大地提升了索引查询速度。
- **与 JWT 完美契合**：验证 Token 后取得的 \`uid\` 可以直接作为路径根路径，查询编写极为直接。`
      },
      "atomic-transactions": {
        title: "7.2 原子事务 (Transactions) 与写批处理 (Write Batches)",
        subtitle: "级联删除与并发操作的强一致性控制",
        markdown: `### Firestore 原子事务与级联删除实现

由于 Firestore 属于 NoSQL 数据库，底层没有内置关系型数据库的外键级联约束（Foreign Key Cascade Delete）。

#### 1. 级联删除挑战
当用户删除一个卡片集（Deck）时，必须清理该 Deck 下的所有卡片。如果使用普通删除，在网络断开或服务器崩溃时，就会产生“垃圾孤儿卡片”，污染数据库并增加存储费用。

#### 2. Firestore 原子事务代码实现
我们使用 NestJS 服务层编写了**数据库强隔离事务**，在单次提交中同时清理 Deck 和旗下所有 Flashcard：
\`\`\`typescript
async function deleteDeckCascading(userId: string, deckId: string): Promise<void> {
  const deckRef = this.db.collection(\`users/\${userId}/decks\`).doc(deckId);
  const cardsCollectionRef = this.db.collection(\`users/\${userId}/flashcards\`);

  // 在单个数据库事务作用域内执行原子操作
  await this.db.runTransaction(async (transaction) => {
    // 限制：所有读取操作（Get）必须在任何写入/删除操作之前完成
    // 1. 检索该卡片集下属的所有卡片引用
    const cardsSnapshot = await transaction.get(
      cardsCollectionRef.where('deckId', '==', deckId)
    );

    // 2. 检查父 Deck 文档状态
    const deckDoc = await transaction.get(deckRef);
    if (!deckDoc.exists) {
      throw new NotFoundException('Target deck not found');
    }

    // 3. 在内存操作缓冲中登记删除子卡片的指令
    cardsSnapshot.docs.forEach((doc) => {
      transaction.delete(doc.ref);
    });

    // 4. 登记删除卡片集主文档的指令
    transaction.delete(deckRef);
  });
}
\`\`\`

#### 3. 事务与写批处理（Write Batches）的选型
- **Write Batches**：只写不读。适用于大批量导入/初始化卡片等高写入量场景，支持在单次请求中写入最多 500 个文档，执行效率极高。
- **Transactions**：先读后写。适用于并发修改或级联删除，如果读取的值被他人修改，事务会自动安全回滚重试，保证逻辑的一致性。`
      },
      "occ-locks": {
        title: "7.3 乐观并发控制 (OCC) 底层并发校验与重试原理",
        subtitle: "Firestore 基于乐观锁的数据版本校验流程",
        markdown: `### Firestore 乐观并发控制 (OCC) 原理

Firestore 在处理并发写入时不使用传统的**悲观锁（Pessimistic Locking）**（即直接锁死数据库行，阻止其他事务读写，这会导致服务产生大量等待队列并拉低并发吞吐）。它采用的是高效的**乐观锁控制（Optimistic Concurrency Control, OCC）**。

#### 1. 乐观锁工作流程
- **快照读取（Snapshots Read）**：事务在执行时，首先将需要读取的文档读入内存，并记录其当前的**版本指纹（Timestamp/Version）**。
- **内存执行（Execution）**：在内存中计算要执行的写入或删除操作，不产生实际物理变动。
- **预提交校验（Verify & Commit）**：向数据库发起提交。Firestore 数据库会核对被事务读取的那些文档在当前这毫秒的版本号，是否与事务刚读取时的版本号一致。
- **冲突重试（Retry）**：如果版本号一致，事务直接提交成功；如果有其他并发连接中途修改了文档（版本号变动），本次事务宣告失败，并自动在内存中重新执行读取和提交动作，直至成功。

#### 2. 事务开发限制
因为 OCC 依赖于“先读后写校验”，因此在 NestJS 事务块 \`runTransaction()\` 内编写逻辑时，如果将 \`transaction.get()\` 置于 \`transaction.delete()\` 或 \`transaction.set()\` 之后，数据库会直接抛出运行期异常，这是我们在编写级联删除服务时必须遵守的严苛开发规范。`
      }
    }
  },
  "spaced-repetition": {
    id: "spaced-repetition",
    title: "Chapter 8: 记忆曲线模型与间隔重复算法 (Spaced Repetition)",
    icon: Award,
    topics: {
      "cognitive-science": {
        title: "8.1 认知科学与艾宾浩斯遗忘临界点控制",
        subtitle: "主动召回、间隔重复与记忆模型设计原理",
        markdown: `### 艾宾浩斯遗忘曲线与认知算法

FlashFlow 的系统核心是为用户安排最佳的复习时间。这建立在两个认知心理学支柱上：

#### 1. 主动召回 (Active Recall)
相比于被动的重复阅读，通过测试性问答（Question -> Answer）让大脑努力回忆某段知识，能建立更牢固的神经元连接。因此，AI 分解的长卡片，正面必须是明确的、原子化的问题，背面是精炼的答案。

#### 2. 间隔重复 (Spaced Repetition)
记忆会随着时间以指数级速度遗忘。但在每次快要遗忘的“临界点”成功进行一次主动召回复习，该知识点在脑中的保存时长就会呈倍数级增长。
算法的目标就是准确计算出这个遗忘临界点，在知识遗忘前夕提示用户复习，用最少的复习次数达成最稳固的长期记忆。`
      },
      "sm2-formulation": {
        title: "8.2 SuperMemo SM-2 算法数学模型深入剖析",
        subtitle: "简易度因子 EF 与复习间隔 I(n) 天数的推导公式",
        markdown: `### SuperMemo SM-2 算法数学原理

SM-2 算法将用户的反馈分为 1-5 五个质量评分（quality, $q$）：
- 5: 完美掌握，毫无迟疑。
- 4: 稍微回忆后成功记起。
- 3: 成功记起，但觉得很吃力。
- 2: 答错，但看到背面答案后立刻想了起来。
- 1: 彻底遗忘。

算法通过这两个核心指标驱动记忆日程：

#### 1. 简易度因子修正 (Ease Factor, $EF$)
$EF$ 衡量卡片的容易程度（默认初始值为 2.5）。每次复习后，根据用户打分动态上下修正：
$$EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))$$
- 若 $q=5$，项为 $+0.1$，EF 增加，说明卡片容易，复习频率会放缓。
- 若 $q=3$，项为 $-0.14$，EF 降低，卡片变难，后续复习频次会变高。
- 约束下限：$EF' \ge 1.3$。

#### 2. 复习时间间隔推导 (Interval, $I$)
复习间隔天数 $I$ 会随着连续成功复习次数 $n$ 指数递增：
- $I(1) = 1$ 天（第 1 次复习）
- $I(2) = 6$ 天（第 2 次复习）
- $I(n) = I(n-1) * EF$（$n > 2$）
可以看出，随着复习成功，复习间隔天数呈倍数扩展，完美贴合记忆遗忘临界点。`
      },
      "sm2-typescript": {
        title: "8.3 间隔重复调度引擎 TypeScript 代码实现",
        subtitle: "calculateSM2 算法核心与到期时间戳转换",
        markdown: `### 间隔重复引擎代码与时区处理

我们在服务端定义并执行了标准的 SM-2 复习调度计算：

#### 1. 核心计算函数实现
\`\`\`typescript
export interface SM2Input {
  repetitions: number; // 之前连续复习成功次数 (n)
  interval: number;    // 当前复习间隔天数 (I)
  easeFactor: number;  // 简易度因子 (EF)
  quality: number;     // 用户本次打分 (q: 1-5)
}

export interface SM2Output {
  repetitions: number;
  interval: number;
  easeFactor: number;
  nextReviewDate: Date;
}

export function calculateSM2({ repetitions, interval, easeFactor, quality }: SM2Input): SM2Output {
  let nextRepetitions = repetitions;
  let nextInterval = interval;
  let nextEaseFactor = easeFactor;

  // 1. 若用户掌握程度合格 (quality >= 3)
  if (quality >= 3) {
    if (repetitions === 0) {
      nextInterval = 1;
    } else if (repetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(interval * easeFactor);
    }
    nextRepetitions += 1;
  } else {
    // 2. 若用户遗忘该卡片 (quality < 3)
    nextRepetitions = 0;
    nextInterval = 1; // 强行重置为 1 天，重新从头复习
  }

  // 3. 计算简易度因子 EF 的变化
  nextEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // 4. 强制约束 EF 下限为 1.3，规避恶性循环
  if (nextEaseFactor < 1.3) {
    nextEaseFactor = 1.3;
  }

  // 5. 根据计算出的间隔天数推算下一次复习的物理日期
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

  return {
    repetitions: nextRepetitions,
    interval: nextInterval,
    easeFactor: nextEaseFactor,
    nextReviewDate,
  };
}
\`\`\`

#### 2. 时间戳序列化与今日到期判断
计算出 \`nextReviewDate\` 后，后端存入 Firestore。
在拉取待复习卡片时，查询指令会以服务器当前物理时间的 \`startOfDay\` 进行过滤筛选，提取所有满足 \`nextReviewDate <= today\` 的卡片并进行打乱，推送给客户端的复习 Hub。`
      }
    }
  },
  "gemini-ai": {
    id: "gemini-ai",
    title: "Chapter 9: Google Gemini AI 提示工程与结构化输出 (Gemini AI)",
    icon: Cpu,
    topics: {
      "prompt-engineering": {
        title: "9.1 提示工程设计与 Few-Shot 少样本引导规范",
        subtitle: "卡片分解与代码复习 Prompts 优化",
        markdown: `### 大模型提示词设计规范

大模型生成的卡片质量直接决定了用户的学习效率。我们通过在服务端进行深度的 Prompt Engineering 提示工程设计以控制其输出质量。

#### 1. 卡片原子化拆解 (Atomic Decomposition)
如果将一整篇复杂的笔记塞给大模型，让其自由发挥，通常会产生大段解释，很不适合复习。我们在 System Prompt 中规定了严苛的“少样本示例（Few-Shot Examples）”：
- **坏卡片例示**：正面“计算机网络”，背面“讲述了TCP/IP协议，其中包含握手和四次挥手...”。(过于宽泛，无法提供有效的主动回忆线索)
- **好卡片例示**：正面“TCP三次握手过程中，第二次握手发送的标志位是什么？”，背面“SYN + ACK”。(颗粒度极细，指向唯一的清晰事实)

#### 2. 代码复习提示词工程 (GitHub Review)
读取用户的近期 Commit 代码后，Prompt 会引导 Gemini 识别提交中的代码语言、变动的核心逻辑和新引入的函数。AI 随后会构造一道针对这段新增逻辑的选择题或改错题，以考核开发人员对最近手写代码语法和设计模式的掌握，实现“学以致用”的极佳反馈回路。`
      },
      "json-schema": {
        title: "9.2 JSON Schema 强类型约束输出接口实现",
        subtitle: "利用 responseSchema 杜绝大模型格式化故障",
        markdown: `### 基于 JSON Schema 的 AI 格式约束

在大语言模型集成中，最头疼的问题莫过于“模型输出格式不稳”。例如有时会输出 \`\`\`json ... \`\`\` 等 Markdown 围栏，或者加入前缀废话，导致后端 \`JSON.parse()\` 直接崩溃。

#### 1. 结构化输出技术 (Structured Outputs)
我们使用的 \`@google/genai\` SDK 支持直接注入响应 Schema 限制：
\`\`\`typescript
const response = await ai.models.generateContent({
  model: 'gemini-1.5-pro',
  contents: prompt,
  config: {
    // 强制输出为 JSON
    responseMimeType: 'application/json',
    // 传入强约束 Schema，限制输出对象属性及结构
    responseSchema: {
      type: 'ARRAY',
      description: 'Newly generated flashcards.',
      items: {
        type: 'OBJECT',
        properties: {
          front: { type: 'STRING', description: 'Question on the front.' },
          back: { type: 'STRING', description: 'Answer on the back.' }
        },
        required: ['front', 'back']
      }
    }
  }
});
\`\`\`

#### 2. 优势分析
有了 <code>responseSchema</code> 的强限制，Gemini Pro 在解码输出时会由谷歌底层服务进行语法约束。返回的响应文本天然就是干净、完全合法的 JSON 数组结构，后端可以直接安全解析并存库，无需编写复杂的正则清洗脚本。`
      },
      "cache-limits": {
        title: "9.3 客户端哈希缓存与 Gemini API 调用限流策略",
        subtitle: "防止接口滥用与降低 Token 开销的本地缓存设计",
        markdown: `### 降本增效：AI 调用频率控制与缓存设计

Gemini API 的调用成本较高，且在高并发时容易触发系统的频控保护（Rate Limiting）。

#### 1. 前端内容哈希本地缓存 (Content Hashing Cache)
当用户输入长文本并请求 AI 分解时，前端会对输入的文本正文内容计算一个哈希值（Hash Index）。
解析出卡片后，前端将 \`{ textHash: cards[] }\` 存入浏览器的 \`localStorage\`，设置 30 天的有效期。如果用户对同一段文本重复点击“AI拆解”，前端会瞬间从本地缓存中加载已生成的卡片，不发送任何网络 API 请求，兼顾了极致的载入速度与降本控制。

#### 2. 后端异步防刷限流 (Rate Limiting)
后端 API 针对 \`/api/ai/decompose\` 和 \`/api/ai/github-review\` 配备了令牌桶限流。限制同一用户每分钟的 AI 操作频率，不仅防止了 Gemini API 密钥被恶意盗刷，也保护了外部服务调用的稳定性。`
      }
    }
  },
  "deployment-cors": {
    id: "deployment-cors",
    title: "Chapter 10: 生产部署、CORS 共享与服务治理 (Deployment & CORS)",
    icon: ShieldCheck,
    topics: {
      "vercel-serverless": {
        title: "10.1 Vercel Serverless 无服务器执行环境限制与冷启动",
        subtitle: "无状态函数环境下的生命周期与数据库链接池管理",
        markdown: `### Vercel Serverless 服务端限制与冷启动治理

将 NestJS 与 Next.js 部署到 Vercel 时，需要面对 Serverless 架构特有的底层限制：

#### 1. 执行时长限制 (Execution Timeout)
Vercel Serverless Functions 在 Hobby 免费计划下仅有 **10秒** 的最大执行时间限制（Pro 计划最高可配置为 900秒）。
如果我们的 AI 调用或 Firestore 事务耗时超过 10秒，函数会被 Vercel 强行终止，引发 \`504 Gateway Timeout\`。为此，我们对 Gemini 的生成长度做出了精简限制，并对大事务进行了微拆分，保证所有 API 都在 3 秒内快速响应。

#### 2. 无状态与冷启动 (Cold Start)
Serverless 容器在无请求时会被自动销毁回收以节省算力。当新请求到达时，系统会重新拉起容器、加载依赖并初始化 NestJS 模块，这会导致首次访问出现 1-3秒 的冷启动延迟。
在后续请求中，容器会保持热激活（Hot Status），响应时间重回毫秒级。

#### 3. 数据库连接池（Connection Pool）隐患
传统的 NestJS 应用在长连接模式下会保持与数据库的持久链接。但在 Serverless 环境中，每次函数拉起都是一个独立的虚拟环境。高并发请求会瞬间拉起数百个 Serverless 函数，导致后端的 Firestore 或数据库连接池连接数暴增而被锁死。
因此，我们使用了基于 REST/HTTP 数据交互的 Firebase SDK，没有长连接心跳，天然契合 Serverless 服务的无状态自动横向扩容能力。`
      },
      "cors-credentials": {
        title: "10.2 跨源资源共享 (CORS) 动态白名单配置规范",
        subtitle: "main.ts 中的跨域白名单动态过滤与安全信道",
        markdown: `### 生产级 CORS 安全配置策略

由于前端和后端部署在不同的物理云端域名下，跨源资源共享（CORS）成为核心的网络门槛。

#### 1. CORS credentials 信任
我们需要支持跨域 Cookie 传输和自定义 Auth 报头，必须在跨域配置中开启 \`credentials: true\`。在开启凭证支持后，CORS 规范规定，\`Access-Control-Allow-Origin\` **绝对不能设置为通配符 \`*\`**，必须返回请求发起方具体的物理域名。

#### 2. 后端 main.ts 中的动态过滤实现
我们编写了动态过滤回调函数，确保安全性的同时允许灵活开发：
\`\`\`typescript
app.enableCors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    const allowedOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
      : [];
      
    const isAllowed =
      allowedOrigins.includes(origin) ||
      /^http:\\/\\/localhost:\\d+$/.test(origin) ||
      /^https?:\\/\\/.*\\.idx-dev\\.googleusercontent\\.com$/.test(origin) ||
      /^https?:\\/\\/.*\\.vercel\\.app$/.test(origin);

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(\`CORS request blocked for origin: \${origin}\`);
      callback(null, true); // 开发联调阶段仅记录警告，生产可开启强阻断
    }
  },
  credentials: true,
});
\`\`\`
此配置自动放行了本地调试、IDX 预览环境、Vercel 预览部署（Preview Deployments）以及前端生产地址，保证了跨域调用的弹性与安全。`
      },
      "checklist-env": {
        title: "10.3 生产环境部署核对 Checklist 与服务治理",
        subtitle: "前后台打通配置检查与未来架构演进路径",
        markdown: `### 部署配置核对单与服务演进建议

#### 1. 部署配置核对单 (Production Checklist)
在将代码合并并触发 Vercel 生产上线前，请严格核对以下环境变量：
- **前端 Web 环境变量**：
  - \`NEXT_PUBLIC_API_URL\`：必须指向生产环境 NestJS API（例如：\`https://flashflow-server.vercel.app/api\`）。
  - \`NEXT_PUBLIC_PROJECT_ID\`：对应生产环境 Firebase 项目 ID。
- **后端 API 环境变量**：
  - \`FIREBASE_SERVICE_ACCOUNT_JSON\`：完整且合法的 Service Account 数字证书凭证 JSON。
  - \`FRONTEND_URL\`：指向前端部署的公网地址（例如：\`https://flashflow-web.vercel.app\`），确保 CORS 跨域通过。
  - \`GOOGLE_GENAI_API_KEY\`：用于生产环境 Gemini 调用。

#### 2. 未来架构演进路径 (Future Scope)
为了应对更大的用户规模和更复杂的业务，项目后续建议演进方向：
- **自动化类型同步 (OpenAPI/Swagger)**：在 NestJS 中注册 Swagger 插件，自动根据 DTO 生成 OpenAPI 描述文件，再通过前端代码生成器（OpenAPI Generator）一键编译生成前端 API 客户端和类型接口，消除类型分歧。
- **微服务化拆分**：将消耗计算资源较重的 AI Service 和番茄钟计时器独立拆分为独立的轻量 Serverless 函数或云函数（Cloud Functions），保障卡片核心 API 的可用性。`
      }
    }
  }
};

const sections = [
  {
    id: "framework-render",
    title: "1. 前端框架与渲染层 (FE Framework)",
    icon: Code,
    subtitle: "Next.js 15, React 18 & i18n 路由",
  },
  {
    id: "state-optimistic",
    title: "2. 前端状态与乐观更新 (State Management)",
    icon: Layers,
    subtitle: "React Contexts & 乐观更新回滚",
  },
  {
    id: "pwa-offline",
    title: "3. PWA 离线高可用 (PWA & Offline)",
    icon: RefreshCw,
    subtitle: "Service Worker 生命期与 Workbox 策略",
  },
  {
    id: "backend-ioc",
    title: "4. 后端核心与 IoC 容器 (NestJS Core)",
    icon: Terminal,
    subtitle: "NestJS 模块化、控制反转与依赖注入",
  },
  {
    id: "backend-pipeline",
    title: "5. 请求生命周期管线 (Request Lifecycle)",
    icon: Layers,
    subtitle: "Guards, Pipes & DTO 运行时参数校验",
  },
  {
    id: "auth-security",
    title: "6. Firebase 鉴权安全 (Auth & Security)",
    icon: ShieldCheck,
    subtitle: "Firebase JWT 数字签名解密与物理隔离",
  },
  {
    id: "firestore-db",
    title: "7. Firestore 数据库设计 (Firestore DB)",
    icon: Database,
    subtitle: "子集合树状结构、乐观锁事务与级联删除",
  },
  {
    id: "spaced-repetition",
    title: "8. 记忆曲线与间隔重复算法 (SM-2 Algorithm)",
    icon: Award,
    subtitle: "遗忘临界控制、SM-2 算法公式与 TS 引擎",
  },
  {
    id: "gemini-ai",
    title: "9. Gemini AI 结构化输出 (Gemini AI)",
    icon: Cpu,
    subtitle: "Few-Shot 提示工程、Schema 约束与本地缓存",
  },
  {
    id: "deployment-cors",
    title: "10. 生产部署、CORS 与治理 (Deployment & CORS)",
    icon: ShieldCheck,
    subtitle: "Vercel Serverless 执行限制与 CORS 动态配置",
  }
];

// ==========================================
// MAIN RENDERING VIEW
// ==========================================

export default function DocsPage() {
  const currentLocale = useCurrentLocale();
  const isZh = currentLocale === "zh";
  const [activeChapterId, setActiveChapterId] = useState("framework-render");
  const [activeTopicId, setActiveTopicId] = useState("nextjs-rsc");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeChapter = DOCUMENTATION_DATA[activeChapterId]!;
  const activeTopic = activeChapter.topics[activeTopicId] || Object.values(activeChapter.topics)[0]!;

  const handleSelectTopic = (chapId: string, topId: string) => {
    setActiveChapterId(chapId);
    setActiveTopicId(topId);
    setMobileMenuOpen(false);
    
    // Smooth scroll to reader area on mobile
    const readerElement = document.getElementById("documentation-reader");
    if (readerElement) {
      readerElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col">
      {/* Top Header Control Area */}
      <div className="border-b bg-muted/40 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                {isZh ? "返回应用" : "Back to Application"}
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-1.5 font-semibold text-sm sm:text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>{isZh ? "系统设计白皮书与全栈规格书" : "Full-Stack System Engineering Specification"}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="md:hidden gap-1.5"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-4 w-4" />
            {isZh ? "选择章节" : "Chapters"}
          </Button>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 p-4 sm:p-6 min-h-0 relative">
        {/* Left/Overlay Navigation Menu */}
        <aside className={`w-full md:w-80 flex-shrink-0 flex flex-col gap-4 absolute md:relative z-40 bg-background md:bg-transparent top-0 left-0 right-0 bottom-0 md:bottom-auto p-4 md:p-0 border-r md:border-r-0 transition-transform duration-200 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 hidden md:flex"
        }`}>
          <div className="flex items-center justify-between px-1 md:px-0">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {isZh ? "全栈开发与设计手册" : "Full-Stack Design Manual"}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-xs"
              onClick={() => setMobileMenuOpen(false)}
            >
              {isZh ? "关闭" : "Close"}
            </Button>
          </div>
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-6">
              {sections.map((chap) => {
                const Icon = chap.icon;
                const isChapterActive = activeChapterId === chap.id;
                const chapterData = DOCUMENTATION_DATA[chap.id]!;
                
                return (
                  <div key={chap.id} className="space-y-1.5">
                    <div className={`flex items-center gap-2 px-2 py-1 text-xs font-bold transition-colors ${
                      isChapterActive ? "text-primary" : "text-muted-foreground/80"
                    }`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{isZh ? chap.title : chap.title}</span>
                    </div>
                    <div className="pl-3 border-l ml-4 flex flex-col gap-1">
                      {Object.entries(chapterData.topics).map(([topId, top]) => {
                        const isTopicActive = activeChapterId === chap.id && activeTopicId === topId;
                        return (
                          <button
                            key={topId}
                            onClick={() => handleSelectTopic(chap.id, topId)}
                            className={`w-full text-left px-2.5 py-2 rounded text-[11px] sm:text-xs font-medium transition-all ${
                              isTopicActive
                                ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary pl-2"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <p className="truncate">{top.title}</p>
                            <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5 font-normal">
                              {top.subtitle}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* Right Reader Area */}
        <main id="documentation-reader" className="flex-1 min-w-0 bg-card border rounded-xl shadow-sm p-4 sm:p-8 flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-11rem)]">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              {activeChapter.title}
            </div>
            <h2 className="text-lg sm:text-xl font-bold mt-1 text-foreground">
              {activeTopic.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeTopic.subtitle}
            </p>
            <Separator className="mt-3.5" />
          </div>

          <ScrollArea className="flex-1 pr-2 mt-2">
            <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans space-y-4">
              {/* Dynamic content loaded based on selected chapter and topic */}
              <div dangerouslySetInnerHTML={{
                __html: activeTopic.markdown
                  .replace(/### (.*)/g, '<h3 class="text-foreground font-bold text-sm sm:text-base mt-4 mb-2">$1</h3>')
                  .replace(/#### (.*)/g, '<h4 class="text-foreground font-bold text-xs sm:text-sm mt-3 mb-1.5">$1</h4>')
                  .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
                  .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-[11px] sm:text-xs font-mono text-primary">$1</code>')
                  .replace(/^- (.*)/gm, '<li class="list-disc ml-4 mt-1">$1</li>')
                  .replace(/`{3}typescript([\s\S]*?)`{3}/g, '<pre class="bg-muted p-4 rounded-lg font-mono text-[10px] sm:text-xs overflow-x-auto border whitespace-pre text-foreground">$1</pre>')
                  .replace(/`{3}text([\s\S]*?)`{3}/g, '<pre class="bg-muted p-4 rounded-lg font-mono text-[10px] sm:text-xs overflow-x-auto border whitespace-pre text-foreground">$1</pre>')
              }} />
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}

