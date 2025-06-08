
// src/lib/i18n/locales/zh.ts
export default {
  // Header
  'header.title': '闪流', 
  'nav.dashboard': '仪表板',
  'nav.decks': '卡组', 
  'nav.manage': '管理卡片',
  'nav.review': '复习',
  'nav.pomodoro': '番茄钟', // New
  'theme.toggle': '切换主题',
  'theme.light': '浅色',
  'theme.dark': '深色',
  'theme.system': '系统',
  'lang.switch.en': 'English',
  'lang.switch.zh': '中文',

  // Auth
  'auth.signInWithGoogle': '使用谷歌登录',
  'auth.signOut': '登出',
  'auth.pleaseSignIn': '请登录后继续。',

  // Metadata
  'metadata.title': '闪流',
  'metadata.description': '通过 AI 驱动的抽认卡和番茄工作法掌握您的学习。',

  // Dashboard Page (src/app/[locale]/page.tsx)
  'dashboard.welcome': '欢迎使用闪流',
  'dashboard.button.create': '创建新卡片',
  'dashboard.button.manage': '管理卡片',
  'dashboard.button.decks': '管理卡组',
  'dashboard.button.review': '开始复习',
  'dashboard.button.pomodoro': '开始番茄钟', // New
  'dashboard.howTo.title': '如何使用闪流',
  'dashboard.howTo.step1': '为每张卡片添加问题和答案来创建新的抽认卡。',
  'dashboard.howTo.step2': '定期复习你的卡片。该应用程序使用智能算法来安排复习。',
  'dashboard.howTo.step3': '在仪表板上跟踪你的进度，看看你掌握了多少张卡片！',
  'dashboard.howTo.step4': '使用番茄钟来集中您的学习时间。', // New


  // Progress Dashboard Component (src/components/ProgressDashboard.tsx)
  'progress.total': '总卡片数',
  'progress.mastered': '已掌握',
  'progress.learning': '学习中',
  'progress.dueToday': '今日到期',
  'progress.loading': '加载统计...',

  // Decks Page (src/app/[locale]/decks/page.tsx)
  'decks.title': '你的卡组',
  'decks.button.create': '创建新卡组',
  'decks.list.loading': '正在加载您的卡组...',
  'decks.list.empty.title': '还没有卡组!',
  'decks.list.empty.description': '您还没有创建任何卡组。点击“创建新卡组”按钮开始吧。',
  'deck.item.cardsCount': '{count} 张卡片',
  'deck.item.edit': '编辑名称',
  'deck.item.delete': '删除卡组',
  'deck.item.delete.confirm.title': '您确定要删除这个卡组吗？',
  'deck.item.delete.confirm.description': '此操作无法撤销。这将永久删除该卡组及其中的所有抽认卡。',
  'deck.item.delete.confirm.cancel': '取消',
  'deck.item.delete.confirm.delete': '删除卡组',
  'deck.form.title.create': '创建新卡组',
  'deck.form.title.edit': '编辑卡组名称',
  'deck.form.label.name': '卡组名称',
  'deck.form.placeholder.name': '输入卡组名称...',
  'deck.form.button.create': '创建卡组',
  'deck.form.button.update': '更新卡组',
  'deck.form.button.saving': '保存中...',
  'toast.deck.created': '卡组创建成功。',
  'toast.deck.updated': '卡组更新成功。',
  'toast.deck.deleted': '卡组删除成功。',
  'toast.deck.error.load': '加载卡组失败。',
  'toast.deck.error.save': '保存卡组失败。',
  'toast.deck.error.delete': '删除卡组失败。',
  'toast.deck.error.nameRequired': '卡组名称不能为空。',

  // Flashcards Page (src/app/[locale]/flashcards/page.tsx)
  'flashcards.title': '你的抽认卡',
  'flashcards.button.create': '创建新卡片',
  // FlashcardListClient
  'flashcards.list.loading': '正在加载您的抽认卡...',
  'flashcards.list.empty.title': '还没有抽认卡!',
  'flashcards.list.empty.description': '您还没有创建任何抽认卡。点击“创建新卡片”按钮开始吧。',

  // Flashcard Item (src/components/FlashcardItem.tsx)
  'flashcard.item.deckLabel': '卡组',
  'flashcard.item.nextReview': '下次复习',
  'flashcard.item.showAnswer': '显示答案',
  'flashcard.item.hideAnswer': '隐藏答案',
  'flashcard.item.edit': '编辑',
  'flashcard.item.delete': '删除',
  'flashcard.item.delete.confirm.title': '你确定吗？',
  'flashcard.item.delete.confirm.description': '此操作无法撤销。这将永久删除此抽认卡。',
  'flashcard.item.delete.confirm.cancel': '取消',
  'flashcard.item.delete.confirm.delete': '删除',

  // Flashcard Form Page (src/components/FlashcardFormPage.tsx)
  'flashcard.form.page.button.back': '返回',
  'flashcard.form.page.title.edit': '编辑抽认卡',
  'flashcard.form.page.title.create.batch': '批量创建抽认卡',
  'flashcard.form.page.title.create.single': '创建新抽认卡',
  'flashcard.form.page.button.switchToBatch': '切换到批量模式',
  'flashcard.form.page.button.switchToSingle': '切换到单卡模式',
  'flashcard.form.page.loading': '加载表单中...',
  'flashcard.form.page.loadingSpecific': '加载抽认卡详情中...',
  // FlashcardForm
  'flashcard.form.title.edit': '编辑抽认卡',
  'flashcard.form.title.create': '创建新抽认卡',
  'flashcard.form.label.front': '正面',
  'flashcard.form.placeholder.front': '输入问题或术语...',
  'flashcard.form.label.back': '背面',
  'flashcard.form.placeholder.back': '输入答案或解释...',
  'flashcard.form.label.deck': '卡组 (可选)',
  'flashcard.form.selectDeck': '选择一个卡组...',
  'flashcard.form.loadingDecks': '加载卡组中...',
  'flashcard.form.noDecks': '没有可用的卡组',
  'flashcard.form.noDecksDescription': '您还没有任何卡组。',
  'flashcard.form.createDeckLink': '现在创建一个？',
  'flashcard.form.noDeckSelected': '未分配 / 无卡组',
  'flashcard.form.button.create': '创建抽认卡',
  'flashcard.form.button.update': '更新抽认卡',
  'flashcard.form.button.saving': '保存中...',
  // BatchFlashcardForm
  'flashcard.batchForm.title': '批量创建抽认卡',
  'flashcard.batchForm.label.input': '批量输入',
  'flashcard.batchForm.placeholder': "每行输入一张抽认卡，格式为：问题:答案\n例如：\n法国的首都是什么？:巴黎\n2 + 2？:4",
  'flashcard.batchForm.description': '每行应包含一张抽认卡。问题和答案应用冒号（:）分隔。批量创建的卡片将不会分配到任何卡组。',
  'flashcard.batchForm.button.save': '保存批量抽认卡',
  'flashcard.batchForm.button.saving': '批量保存中...',
  // Toasts
  'toast.flashcard.notFound': '未找到抽认卡。',
  'toast.flashcard.created': '抽认卡创建成功。',
  'toast.flashcard.updated': '抽认卡更新成功。',
  'toast.flashcard.deleted': '抽认卡已删除。',
  'toast.flashcard.error.save': '保存抽认卡失败。',
  'toast.flashcard.error.delete': '删除抽认卡失败。',
  'toast.batch.error.parse': '部分行未处理。请为每行使用“问题:答案”格式。',
  'toast.batch.error.noValidCards': "未找到有效卡片。未添加任何卡片。请确保卡片格式为“问题:答案”且不为空。",
  'toast.batch.error.emptyInput': '批量输入为空。',
  'toast.batch.success': '已成功从批量操作中创建 {count} 张抽认卡。',
  'toast.batch.error.save': '保存批量抽认卡失败。',

  // Review Page (src/app/[locale]/review/ReviewModeClient.tsx)
  'review.loading': '加载复习会话中...',
  'review.noCards.title': '还没有抽认卡!',
  'review.noCards.description': '创建一些抽认卡来开始您的学习之旅吧。',
  'review.noCards.button.create': '创建抽认卡',
  'review.ready.title': '准备好复习了吗?',
  'review.ready.due.text': '您有 {count} 张卡片需要进行间隔重复复习。',
  'review.ready.due.none': '目前没有卡片需要进行间隔重复复习。',
  'review.button.startSpaced': '开始间隔重复 ({count})',
  'review.button.reviewAll': '复习所有卡片 ({count})',
  'review.tip.noSpacedRepetition': '提示：创建更多卡片或等待计划的复习以进行间隔重复模式。',
  'review.sessionComplete.title': '会话完成!',
  'review.sessionComplete.description': '您已复习完本次会话中的所有卡片。接下来做什么？',
  'review.sessionComplete.button.backToDashboard': '返回仪表板',
  'review.sessionComplete.button.reviewAllAgain': '再次复习所有卡片 ({count})',
  'review.loadingCard': '加载卡片中...',
  'review.cardProgress': '卡片 {currentIndex} / {totalCards}',
  'review.button.flip.showQuestion': '显示问题',
  'review.button.flip.showAnswer': '显示答案',
  'review.button.progress.tryAgain': '再试一次',
  'review.button.progress.later': '稍后',
  'review.button.progress.mastered': '已掌握',
  'review.processing': '处理中...',
  'toast.progress.saved': '进度已保存',
  'toast.progress.saved.description': '卡片已标记为“{performance}”。下次复习时间：{nextReviewDate}。',
  'toast.progress.error': '无法保存进度：{errorMessage}。请稍后再试。',

  // Pomodoro Page (src/app/[locale]/pomodoro/PomodoroClient.tsx)
  'pomodoro.title': '番茄钟计时器',
  'pomodoro.settings.durationLabel': '番茄钟时长（分钟）：',
  'pomodoro.settings.durationPlaceholder': '例如：25',
  'pomodoro.button.start': '开始',
  'pomodoro.button.pause': '暂停',
  'pomodoro.button.continue': '继续',
  'pomodoro.button.giveUp': '放弃',
  'pomodoro.button.reset': '重置计时器',
  'pomodoro.notes.label': '快速笔记 / 任务残留：',
  'pomodoro.notes.placeholder': '记下中断或您离开的地方...',
  'pomodoro.toast.completed': '番茄钟时间到！',
  'pomodoro.toast.completed.description': '休息一下吧。',
  'pomodoro.auth.required': '请登录以使用番茄钟功能。',


  // General
  'success': '成功',
  'error': '错误',

} as const;
