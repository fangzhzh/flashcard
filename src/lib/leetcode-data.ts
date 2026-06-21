// LeetCode problem categories and curated problem sets
// Sourced from:
//   - ~/workspace/leetcode/algorithm notes (user's personal notes)
//   - osjobs.net/topk Top K FAANG interview questions (Google/Meta/Amazon)

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Familiarity = 0 | 1 | 2 | 3 | 4;
// 0 = Not attempted, 1 = 又忘了, 2 = 模糊, 3 = 熟悉, 4 = 完全掌握

export interface LeetCodeProblem {
  id: string;
  num: number;
  title: string;
  difficulty: Difficulty;
  category: string;
  tags: string[];
  url: string; // Direct LeetCode URL
  companies?: string[]; // e.g. ['Google', 'Meta', 'Amazon']
  votes?: number; // osjobs.net vote count
  isCustom?: boolean; // user-added
}

export interface LeetCodeCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  problems: LeetCodeProblem[];
}

// --- FAANG HIGH-FREQUENCY CATEGORY (from osjobs.net Top K) ---
// Google (40), Meta/Facebook (73 page1), Amazon (35)
// Deduplicated, sorted by total votes descending

const GOOGLE_PROBLEMS: LeetCodeProblem[] = [
  { id: 'g-1048', num: 1048, title: 'Longest String Chain', difficulty: 'Medium', category: 'faang', tags: ['dp', 'hash-table'], url: 'https://leetcode.com/problems/longest-string-chain/', companies: ['Google'], votes: 29 },
  { id: 'g-105', num: 105, title: 'Construct Binary Tree from Preorder and Inorder Traversal', difficulty: 'Medium', category: 'faang', tags: ['tree', 'array', 'dfs'], url: 'https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/', companies: ['Google'], votes: 21 },
  { id: 'g-398', num: 398, title: 'Random Pick Index', difficulty: 'Medium', category: 'faang', tags: ['hash-table', 'math', 'random'], url: 'https://leetcode.com/problems/random-pick-index/', companies: ['Google'], votes: 16 },
  { id: 'g-317', num: 317, title: 'Shortest Distance from All Buildings', difficulty: 'Hard', category: 'faang', tags: ['bfs', 'grid'], url: 'https://leetcode.com/problems/shortest-distance-from-all-buildings/', companies: ['Google'], votes: 16 },
  { id: 'g-394', num: 394, title: 'Decode String', difficulty: 'Medium', category: 'faang', tags: ['stack', 'string', 'recursion'], url: 'https://leetcode.com/problems/decode-string/', companies: ['Google'], votes: 16 },
  { id: 'g-150', num: 150, title: 'Evaluate Reverse Polish Notation', difficulty: 'Medium', category: 'faang', tags: ['stack', 'array', 'math'], url: 'https://leetcode.com/problems/evaluate-reverse-polish-notation/', companies: ['Google'], votes: 15 },
  { id: 'g-621', num: 621, title: 'Task Scheduler', difficulty: 'Medium', category: 'faang', tags: ['heap', 'greedy', 'hash-table'], url: 'https://leetcode.com/problems/task-scheduler/', companies: ['Google'], votes: 14 },
  { id: 'g-269', num: 269, title: 'Alien Dictionary', difficulty: 'Hard', category: 'faang', tags: ['graph', 'topological-sort', 'bfs'], url: 'https://leetcode.com/problems/alien-dictionary/', companies: ['Google'], votes: 14 },
  { id: 'g-1146', num: 1146, title: 'Snapshot Array', difficulty: 'Medium', category: 'faang', tags: ['binary-search', 'design'], url: 'https://leetcode.com/problems/snapshot-array/', companies: ['Google'], votes: 14 },
  { id: 'g-695', num: 695, title: 'Max Area of Island', difficulty: 'Medium', category: 'faang', tags: ['dfs', 'bfs', 'grid'], url: 'https://leetcode.com/problems/max-area-of-island/', companies: ['Google'], votes: 13 },
  { id: 'g-57', num: 57, title: 'Insert Interval', difficulty: 'Medium', category: 'faang', tags: ['array'], url: 'https://leetcode.com/problems/insert-interval/', companies: ['Google'], votes: 13 },
  { id: 'g-297', num: 297, title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard', category: 'faang', tags: ['tree', 'bfs', 'design'], url: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/', companies: ['Google'], votes: 12 },
  { id: 'g-56', num: 56, title: 'Merge Intervals', difficulty: 'Medium', category: 'faang', tags: ['sorting', 'array'], url: 'https://leetcode.com/problems/merge-intervals/', companies: ['Google'], votes: 12 },
  { id: 'g-1631', num: 1631, title: 'Path With Minimum Effort', difficulty: 'Medium', category: 'faang', tags: ['binary-search', 'bfs', 'union-find'], url: 'https://leetcode.com/problems/path-with-minimum-effort/', companies: ['Google'], votes: 12 },
  { id: 'g-127', num: 127, title: 'Word Ladder', difficulty: 'Hard', category: 'faang', tags: ['bfs', 'hash-table', 'string'], url: 'https://leetcode.com/problems/word-ladder/', companies: ['Google'], votes: 12 },
  { id: 'g-528', num: 528, title: 'Random Pick with Weight', difficulty: 'Medium', category: 'faang', tags: ['math', 'binary-search', 'prefix-sum'], url: 'https://leetcode.com/problems/random-pick-with-weight/', companies: ['Google'], votes: 12 },
  { id: 'g-99', num: 99, title: 'Recover Binary Search Tree', difficulty: 'Medium', category: 'faang', tags: ['tree', 'bst', 'dfs'], url: 'https://leetcode.com/problems/recover-binary-search-tree/', companies: ['Google'], votes: 11 },
];

const META_PROBLEMS: LeetCodeProblem[] = [
  { id: 'm-359', num: 359, title: 'Logger Rate Limiter', difficulty: 'Easy', category: 'faang', tags: ['hash-table', 'design'], url: 'https://leetcode.com/problems/logger-rate-limiter/', companies: ['Meta'], votes: 20 },
  { id: 'm-133', num: 133, title: 'Clone Graph', difficulty: 'Medium', category: 'faang', tags: ['graph', 'bfs', 'dfs'], url: 'https://leetcode.com/problems/clone-graph/', companies: ['Meta'], votes: 20 },
  { id: 'm-138', num: 138, title: 'Copy List with Random Pointer', difficulty: 'Medium', category: 'faang', tags: ['linked-list', 'hash-table'], url: 'https://leetcode.com/problems/copy-list-with-random-pointer/', companies: ['Meta'], votes: 19 },
  { id: 'm-124', num: 124, title: 'Binary Tree Maximum Path Sum', difficulty: 'Hard', category: 'faang', tags: ['tree', 'dfs', 'dp'], url: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/', companies: ['Meta'], votes: 19 },
  { id: 'm-1268', num: 1268, title: 'Search Suggestions System', difficulty: 'Medium', category: 'faang', tags: ['trie', 'binary-search', 'string'], url: 'https://leetcode.com/problems/search-suggestions-system/', companies: ['Meta'], votes: 18 },
  { id: 'm-953', num: 953, title: 'Verifying an Alien Dictionary', difficulty: 'Easy', category: 'faang', tags: ['hash-table', 'string'], url: 'https://leetcode.com/problems/verifying-an-alien-dictionary/', companies: ['Meta'], votes: 18 },
  { id: 'm-973', num: 973, title: 'K Closest Points to Origin', difficulty: 'Medium', category: 'faang', tags: ['heap', 'sorting', 'geometry'], url: 'https://leetcode.com/problems/k-closest-points-to-origin/', companies: ['Meta'], votes: 18 },
  { id: 'm-636', num: 636, title: 'Exclusive Time of Functions', difficulty: 'Medium', category: 'faang', tags: ['stack', 'array'], url: 'https://leetcode.com/problems/exclusive-time-of-functions/', companies: ['Meta'], votes: 18 },
  { id: 'm-210', num: 210, title: 'Course Schedule II', difficulty: 'Medium', category: 'faang', tags: ['graph', 'topological-sort', 'bfs'], url: 'https://leetcode.com/problems/course-schedule-ii/', companies: ['Meta'], votes: 17 },
  { id: 'm-329', num: 329, title: 'Longest Increasing Path in a Matrix', difficulty: 'Hard', category: 'faang', tags: ['dfs', 'dp', 'memoization'], url: 'https://leetcode.com/problems/longest-increasing-path-in-a-matrix/', companies: ['Meta'], votes: 16 },
  { id: 'm-523', num: 523, title: 'Continuous Subarray Sum', difficulty: 'Medium', category: 'faang', tags: ['hash-table', 'prefix-sum'], url: 'https://leetcode.com/problems/continuous-subarray-sum/', companies: ['Meta'], votes: 16 },
  { id: 'm-1249', num: 1249, title: 'Minimum Remove to Make Valid Parentheses', difficulty: 'Medium', category: 'faang', tags: ['stack', 'string'], url: 'https://leetcode.com/problems/minimum-remove-to-make-valid-parentheses/', companies: ['Meta'], votes: 15 },
  { id: 'm-139', num: 139, title: 'Word Break', difficulty: 'Hard', category: 'faang', tags: ['dp', 'trie', 'memoization'], url: 'https://leetcode.com/problems/word-break/', companies: ['Meta'], votes: 14 },
  { id: 'm-543', num: 543, title: 'Diameter of Binary Tree', difficulty: 'Easy', category: 'faang', tags: ['tree', 'dfs'], url: 'https://leetcode.com/problems/diameter-of-binary-tree/', companies: ['Meta'], votes: 14 },
  { id: 'm-347', num: 347, title: 'Top K Frequent Elements', difficulty: 'Medium', category: 'faang', tags: ['heap', 'hash-table', 'bucket-sort'], url: 'https://leetcode.com/problems/top-k-frequent-elements/', companies: ['Meta'], votes: 14 },
  { id: 'm-560', num: 560, title: 'Subarray Sum Equals K', difficulty: 'Medium', category: 'faang', tags: ['hash-table', 'prefix-sum'], url: 'https://leetcode.com/problems/subarray-sum-equals-k/', companies: ['Meta'], votes: 13 },
  { id: 'm-23', num: 23, title: 'Merge K Sorted Lists', difficulty: 'Hard', category: 'faang', tags: ['linked-list', 'heap', 'divide-conquer'], url: 'https://leetcode.com/problems/merge-k-sorted-lists/', companies: ['Meta'], votes: 13 },
  { id: 'm-236', num: 236, title: 'Lowest Common Ancestor of a Binary Tree', difficulty: 'Medium', category: 'faang', tags: ['tree', 'dfs'], url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/', companies: ['Meta'], votes: 13 },
  { id: 'm-42', num: 42, title: 'Trapping Rain Water', difficulty: 'Hard', category: 'faang', tags: ['stack', 'two-pointers', 'dp'], url: 'https://leetcode.com/problems/trapping-rain-water/', companies: ['Meta'], votes: 11 },
  { id: 'm-721', num: 721, title: 'Accounts Merge', difficulty: 'Medium', category: 'faang', tags: ['union-find', 'dfs', 'string'], url: 'https://leetcode.com/problems/accounts-merge/', companies: ['Meta'], votes: 10 },
  { id: 'm-863', num: 863, title: 'All Nodes Distance K in Binary Tree', difficulty: 'Medium', category: 'faang', tags: ['tree', 'bfs', 'dfs'], url: 'https://leetcode.com/problems/all-nodes-distance-k-in-binary-tree/', companies: ['Meta'], votes: 10 },
  { id: 'm-301', num: 301, title: 'Remove Invalid Parentheses', difficulty: 'Hard', category: 'faang', tags: ['backtracking', 'bfs', 'string'], url: 'https://leetcode.com/problems/remove-invalid-parentheses/', companies: ['Meta'], votes: 10 },
  { id: 'm-238', num: 238, title: 'Product of Array Except Self', difficulty: 'Medium', category: 'faang', tags: ['prefix-sum', 'array'], url: 'https://leetcode.com/problems/product-of-array-except-self/', companies: ['Meta'], votes: 12 },
];

const AMAZON_PROBLEMS: LeetCodeProblem[] = [
  { id: 'a-106', num: 106, title: 'Construct Binary Tree from Inorder and Postorder Traversal', difficulty: 'Medium', category: 'faang', tags: ['tree', 'array', 'dfs'], url: 'https://leetcode.com/problems/construct-binary-tree-from-inorder-and-postorder-traversal/', companies: ['Amazon'], votes: 23 },
  { id: 'a-146', num: 146, title: 'LRU Cache', difficulty: 'Medium', category: 'faang', tags: ['hash-table', 'linked-list', 'design'], url: 'https://leetcode.com/problems/lru-cache/', companies: ['Amazon'], votes: 21 },
  { id: 'a-49', num: 49, title: 'Group Anagrams', difficulty: 'Medium', category: 'faang', tags: ['hash-table', 'string', 'sorting'], url: 'https://leetcode.com/problems/group-anagrams/', companies: ['Amazon'], votes: 19 },
  { id: 'a-200', num: 200, title: 'Number of Islands', difficulty: 'Medium', category: 'faang', tags: ['dfs', 'bfs', 'grid'], url: 'https://leetcode.com/problems/number-of-islands/', companies: ['Amazon'], votes: 18 },
  { id: 'a-126', num: 126, title: 'Word Ladder II', difficulty: 'Hard', category: 'faang', tags: ['bfs', 'backtracking', 'string'], url: 'https://leetcode.com/problems/word-ladder-ii/', companies: ['Amazon'], votes: 15 },
  { id: 'a-56', num: 56, title: 'Merge Intervals', difficulty: 'Medium', category: 'faang', tags: ['sorting', 'array'], url: 'https://leetcode.com/problems/merge-intervals/', companies: ['Amazon'], votes: 14 },
  { id: 'a-322', num: 322, title: 'Coin Change', difficulty: 'Medium', category: 'faang', tags: ['dp', 'bfs'], url: 'https://leetcode.com/problems/coin-change/', companies: ['Amazon'], votes: 14 },
  { id: 'a-253', num: 253, title: 'Meeting Rooms II', difficulty: 'Medium', category: 'faang', tags: ['heap', 'sorting', 'greedy'], url: 'https://leetcode.com/problems/meeting-rooms-ii/', companies: ['Amazon'], votes: 14 },
  { id: 'a-472', num: 472, title: 'Concatenated Words', difficulty: 'Hard', category: 'faang', tags: ['dp', 'trie'], url: 'https://leetcode.com/problems/concatenated-words/', companies: ['Amazon'], votes: 14 },
  { id: 'a-238', num: 238, title: 'Product of Array Except Self', difficulty: 'Medium', category: 'faang', tags: ['prefix-sum', 'array'], url: 'https://leetcode.com/problems/product-of-array-except-self/', companies: ['Amazon'], votes: 14 },
  { id: 'a-121', num: 121, title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', category: 'faang', tags: ['dp', 'array'], url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', companies: ['Amazon'], votes: 12 },
  { id: 'a-212', num: 212, title: 'Word Search II', difficulty: 'Hard', category: 'faang', tags: ['trie', 'backtracking', 'grid'], url: 'https://leetcode.com/problems/word-search-ii/', companies: ['Amazon'], votes: 10 },
  { id: 'a-17', num: 17, title: 'Letter Combinations of a Phone Number', difficulty: 'Medium', category: 'faang', tags: ['backtracking', 'string'], url: 'https://leetcode.com/problems/letter-combinations-of-a-phone-number/', companies: ['Amazon'], votes: 6 },
  { id: 'a-295', num: 295, title: 'Find Median from Data Stream', difficulty: 'Hard', category: 'faang', tags: ['heap', 'design', 'two-pointers'], url: 'https://leetcode.com/problems/find-median-from-data-stream/', companies: ['Amazon'], votes: 4 },
];

// Merge and deduplicate by problem number, combining company labels and summing votes
function mergeAndDedup(lists: LeetCodeProblem[][]): LeetCodeProblem[] {
  const map = new Map<number, LeetCodeProblem>();
  for (const list of lists) {
    for (const p of list) {
      if (map.has(p.num)) {
        const existing = map.get(p.num)!;
        existing.companies = [...new Set([...(existing.companies || []), ...(p.companies || [])])];
        existing.votes = (existing.votes || 0) + (p.votes || 0);
      } else {
        map.set(p.num, { ...p });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => (b.votes || 0) - (a.votes || 0));
}

export const LEETCODE_CATEGORIES: LeetCodeCategory[] = [
  {
    id: 'faang',
    name: '🏆 FAANG 高频题',
    icon: '🏆',
    description: 'Google / Meta / Amazon 面试真实高频算法题，按热度排序',
    problems: mergeAndDedup([GOOGLE_PROBLEMS, META_PROBLEMS, AMAZON_PROBLEMS]),
  },
  {
    id: 'linked-list',
    name: '🔗 链表 Linked List',
    icon: '🔗',
    description: '链表操作：翻转、合并、快慢指针、dummy节点',
    problems: [
      { id: '206', num: 206, title: 'Reverse Linked List', difficulty: 'Easy', category: 'linked-list', tags: ['linked-list', 'recursion'], url: 'https://leetcode.com/problems/reverse-linked-list/' },
      { id: '21', num: 21, title: 'Merge Two Sorted Lists', difficulty: 'Easy', category: 'linked-list', tags: ['linked-list', 'recursion'], url: 'https://leetcode.com/problems/merge-two-sorted-lists/' },
      { id: '23', num: 23, title: 'Merge K Sorted Lists', difficulty: 'Hard', category: 'linked-list', tags: ['linked-list', 'heap', 'divide-conquer'], url: 'https://leetcode.com/problems/merge-k-sorted-lists/' },
      { id: '141', num: 141, title: 'Linked List Cycle', difficulty: 'Easy', category: 'linked-list', tags: ['linked-list', 'two-pointers'], url: 'https://leetcode.com/problems/linked-list-cycle/' },
      { id: '142', num: 142, title: 'Linked List Cycle II', difficulty: 'Medium', category: 'linked-list', tags: ['linked-list', 'two-pointers'], url: 'https://leetcode.com/problems/linked-list-cycle-ii/' },
      { id: '19', num: 19, title: 'Remove Nth Node From End of List', difficulty: 'Medium', category: 'linked-list', tags: ['linked-list', 'two-pointers'], url: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/' },
      { id: '25', num: 25, title: 'Reverse Nodes in k-Group', difficulty: 'Hard', category: 'linked-list', tags: ['linked-list', 'recursion'], url: 'https://leetcode.com/problems/reverse-nodes-in-k-group/' },
      { id: '146', num: 146, title: 'LRU Cache', difficulty: 'Medium', category: 'linked-list', tags: ['hash-table', 'linked-list', 'design'], url: 'https://leetcode.com/problems/lru-cache/' },
      { id: '160', num: 160, title: 'Intersection of Two Linked Lists', difficulty: 'Easy', category: 'linked-list', tags: ['linked-list', 'two-pointers'], url: 'https://leetcode.com/problems/intersection-of-two-linked-lists/' },
      { id: '234', num: 234, title: 'Palindrome Linked List', difficulty: 'Easy', category: 'linked-list', tags: ['linked-list', 'two-pointers', 'stack'], url: 'https://leetcode.com/problems/palindrome-linked-list/' },
    ]
  },
  {
    id: 'binary-tree',
    name: '🌲 二叉树 Binary Tree',
    icon: '🌲',
    description: '树的遍历：前序/中序/后序/层序，递归与迭代',
    problems: [
      { id: '94', num: 94, title: 'Binary Tree Inorder Traversal', difficulty: 'Easy', category: 'binary-tree', tags: ['tree', 'dfs'], url: 'https://leetcode.com/problems/binary-tree-inorder-traversal/' },
      { id: '102', num: 102, title: 'Binary Tree Level Order Traversal', difficulty: 'Medium', category: 'binary-tree', tags: ['tree', 'bfs'], url: 'https://leetcode.com/problems/binary-tree-level-order-traversal/' },
      { id: '104', num: 104, title: 'Maximum Depth of Binary Tree', difficulty: 'Easy', category: 'binary-tree', tags: ['tree', 'dfs', 'bfs'], url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/' },
      { id: '124', num: 124, title: 'Binary Tree Maximum Path Sum', difficulty: 'Hard', category: 'binary-tree', tags: ['tree', 'dfs', 'dp'], url: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/' },
      { id: '297', num: 297, title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard', category: 'binary-tree', tags: ['tree', 'bfs', 'design'], url: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/' },
      { id: '236', num: 236, title: 'Lowest Common Ancestor of a Binary Tree', difficulty: 'Medium', category: 'binary-tree', tags: ['tree', 'dfs'], url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/' },
      { id: '543', num: 543, title: 'Diameter of Binary Tree', difficulty: 'Easy', category: 'binary-tree', tags: ['tree', 'dfs'], url: 'https://leetcode.com/problems/diameter-of-binary-tree/' },
      { id: '105', num: 105, title: 'Construct Binary Tree from Preorder and Inorder Traversal', difficulty: 'Medium', category: 'binary-tree', tags: ['tree', 'array', 'dfs'], url: 'https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/' },
      { id: '572', num: 572, title: 'Subtree of Another Tree', difficulty: 'Easy', category: 'binary-tree', tags: ['tree', 'dfs'], url: 'https://leetcode.com/problems/subtree-of-another-tree/' },
      { id: '199', num: 199, title: 'Binary Tree Right Side View', difficulty: 'Medium', category: 'binary-tree', tags: ['tree', 'bfs', 'dfs'], url: 'https://leetcode.com/problems/binary-tree-right-side-view/' },
    ]
  },
  {
    id: 'dynamic-programming',
    name: '💹 动态规划 DP',
    icon: '💹',
    description: 'DP四步骤：状态定义、转移方程、边界、优化',
    problems: [
      { id: '70', num: 70, title: 'Climbing Stairs', difficulty: 'Easy', category: 'dynamic-programming', tags: ['dp', 'math'], url: 'https://leetcode.com/problems/climbing-stairs/' },
      { id: '198', num: 198, title: 'House Robber', difficulty: 'Medium', category: 'dynamic-programming', tags: ['dp'], url: 'https://leetcode.com/problems/house-robber/' },
      { id: '300', num: 300, title: 'Longest Increasing Subsequence', difficulty: 'Medium', category: 'dynamic-programming', tags: ['dp', 'binary-search'], url: 'https://leetcode.com/problems/longest-increasing-subsequence/' },
      { id: '322', num: 322, title: 'Coin Change', difficulty: 'Medium', category: 'dynamic-programming', tags: ['dp', 'bfs'], url: 'https://leetcode.com/problems/coin-change/' },
      { id: '416', num: 416, title: 'Partition Equal Subset Sum', difficulty: 'Medium', category: 'dynamic-programming', tags: ['dp', 'array'], url: 'https://leetcode.com/problems/partition-equal-subset-sum/' },
      { id: '72', num: 72, title: 'Edit Distance', difficulty: 'Medium', category: 'dynamic-programming', tags: ['dp', 'string'], url: 'https://leetcode.com/problems/edit-distance/' },
      { id: '1143', num: 1143, title: 'Longest Common Subsequence', difficulty: 'Medium', category: 'dynamic-programming', tags: ['dp', 'string'], url: 'https://leetcode.com/problems/longest-common-subsequence/' },
      { id: '309', num: 309, title: 'Best Time to Buy and Sell Stock with Cooldown', difficulty: 'Medium', category: 'dynamic-programming', tags: ['dp'], url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/' },
      { id: '279', num: 279, title: 'Perfect Squares', difficulty: 'Medium', category: 'dynamic-programming', tags: ['dp', 'bfs', 'math'], url: 'https://leetcode.com/problems/perfect-squares/' },
      { id: '139', num: 139, title: 'Word Break', difficulty: 'Hard', category: 'dynamic-programming', tags: ['dp', 'trie', 'memoization'], url: 'https://leetcode.com/problems/word-break/' },
      { id: '1048', num: 1048, title: 'Longest String Chain', difficulty: 'Medium', category: 'dynamic-programming', tags: ['dp', 'hash-table'], url: 'https://leetcode.com/problems/longest-string-chain/' },
    ]
  },
  {
    id: 'graph',
    name: '🗺️ 图论 Graph',
    icon: '🗺️',
    description: 'BFS/DFS图遍历、拓扑排序、并查集、最短路径',
    problems: [
      { id: '200', num: 200, title: 'Number of Islands', difficulty: 'Medium', category: 'graph', tags: ['dfs', 'bfs', 'grid'], url: 'https://leetcode.com/problems/number-of-islands/' },
      { id: '207', num: 207, title: 'Course Schedule', difficulty: 'Medium', category: 'graph', tags: ['graph', 'topological-sort', 'bfs', 'dfs'], url: 'https://leetcode.com/problems/course-schedule/' },
      { id: '210', num: 210, title: 'Course Schedule II', difficulty: 'Medium', category: 'graph', tags: ['graph', 'topological-sort'], url: 'https://leetcode.com/problems/course-schedule-ii/' },
      { id: '417', num: 417, title: 'Pacific Atlantic Water Flow', difficulty: 'Medium', category: 'graph', tags: ['dfs', 'bfs', 'grid'], url: 'https://leetcode.com/problems/pacific-atlantic-water-flow/' },
      { id: '547', num: 547, title: 'Number of Provinces', difficulty: 'Medium', category: 'graph', tags: ['graph', 'union-find', 'dfs'], url: 'https://leetcode.com/problems/number-of-provinces/' },
      { id: '785', num: 785, title: 'Is Graph Bipartite?', difficulty: 'Medium', category: 'graph', tags: ['graph', 'bfs', 'dfs'], url: 'https://leetcode.com/problems/is-graph-bipartite/' },
      { id: '127', num: 127, title: 'Word Ladder', difficulty: 'Hard', category: 'graph', tags: ['bfs', 'hash-table', 'string'], url: 'https://leetcode.com/problems/word-ladder/' },
      { id: '743', num: 743, title: 'Network Delay Time', difficulty: 'Medium', category: 'graph', tags: ['graph', 'dijkstra', 'heap'], url: 'https://leetcode.com/problems/network-delay-time/' },
      { id: '269', num: 269, title: 'Alien Dictionary', difficulty: 'Hard', category: 'graph', tags: ['graph', 'topological-sort', 'bfs'], url: 'https://leetcode.com/problems/alien-dictionary/' },
      { id: '133', num: 133, title: 'Clone Graph', difficulty: 'Medium', category: 'graph', tags: ['graph', 'bfs', 'dfs'], url: 'https://leetcode.com/problems/clone-graph/' },
    ]
  },
  {
    id: 'sliding-window',
    name: '🪟 滑动窗口 Sliding Window',
    icon: '🪟',
    description: '双指针维护窗口，高效解决子数组/子字符串问题',
    problems: [
      { id: '3', num: 3, title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', category: 'sliding-window', tags: ['sliding-window', 'hash-table', 'string'], url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/' },
      { id: '76', num: 76, title: 'Minimum Window Substring', difficulty: 'Hard', category: 'sliding-window', tags: ['sliding-window', 'hash-table', 'string'], url: 'https://leetcode.com/problems/minimum-window-substring/' },
      { id: '438', num: 438, title: 'Find All Anagrams in a String', difficulty: 'Medium', category: 'sliding-window', tags: ['sliding-window', 'hash-table', 'string'], url: 'https://leetcode.com/problems/find-all-anagrams-in-a-string/' },
      { id: '209', num: 209, title: 'Minimum Size Subarray Sum', difficulty: 'Medium', category: 'sliding-window', tags: ['sliding-window', 'two-pointers'], url: 'https://leetcode.com/problems/minimum-size-subarray-sum/' },
      { id: '560', num: 560, title: 'Subarray Sum Equals K', difficulty: 'Medium', category: 'sliding-window', tags: ['prefix-sum', 'hash-table'], url: 'https://leetcode.com/problems/subarray-sum-equals-k/' },
      { id: '424', num: 424, title: 'Longest Repeating Character Replacement', difficulty: 'Medium', category: 'sliding-window', tags: ['sliding-window', 'hash-table'], url: 'https://leetcode.com/problems/longest-repeating-character-replacement/' },
    ]
  },
  {
    id: 'binary-search',
    name: '🔎 二分查找 Binary Search',
    icon: '🔎',
    description: '二分查找模板、边界处理、旋转数组',
    problems: [
      { id: '704', num: 704, title: 'Binary Search', difficulty: 'Easy', category: 'binary-search', tags: ['binary-search'], url: 'https://leetcode.com/problems/binary-search/' },
      { id: '33', num: 33, title: 'Search in Rotated Sorted Array', difficulty: 'Medium', category: 'binary-search', tags: ['binary-search', 'array'], url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/' },
      { id: '34', num: 34, title: 'Find First and Last Position of Element in Sorted Array', difficulty: 'Medium', category: 'binary-search', tags: ['binary-search', 'array'], url: 'https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/' },
      { id: '153', num: 153, title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium', category: 'binary-search', tags: ['binary-search', 'array'], url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/' },
      { id: '162', num: 162, title: 'Find Peak Element', difficulty: 'Medium', category: 'binary-search', tags: ['binary-search', 'array'], url: 'https://leetcode.com/problems/find-peak-element/' },
      { id: '875', num: 875, title: 'Koko Eating Bananas', difficulty: 'Medium', category: 'binary-search', tags: ['binary-search', 'array'], url: 'https://leetcode.com/problems/koko-eating-bananas/' },
    ]
  },
  {
    id: 'backtracking',
    name: '☯️ 回溯 Backtracking',
    icon: '☯️',
    description: '组合、排列、子集，剪枝优化',
    problems: [
      { id: '46', num: 46, title: 'Permutations', difficulty: 'Medium', category: 'backtracking', tags: ['backtracking', 'array'], url: 'https://leetcode.com/problems/permutations/' },
      { id: '78', num: 78, title: 'Subsets', difficulty: 'Medium', category: 'backtracking', tags: ['backtracking', 'array', 'bit-manipulation'], url: 'https://leetcode.com/problems/subsets/' },
      { id: '39', num: 39, title: 'Combination Sum', difficulty: 'Medium', category: 'backtracking', tags: ['backtracking', 'array'], url: 'https://leetcode.com/problems/combination-sum/' },
      { id: '79', num: 79, title: 'Word Search', difficulty: 'Medium', category: 'backtracking', tags: ['backtracking', 'grid', 'dfs'], url: 'https://leetcode.com/problems/word-search/' },
      { id: '212', num: 212, title: 'Word Search II', difficulty: 'Hard', category: 'backtracking', tags: ['backtracking', 'trie', 'grid'], url: 'https://leetcode.com/problems/word-search-ii/' },
      { id: '17', num: 17, title: 'Letter Combinations of a Phone Number', difficulty: 'Medium', category: 'backtracking', tags: ['backtracking', 'string'], url: 'https://leetcode.com/problems/letter-combinations-of-a-phone-number/' },
    ]
  },
  {
    id: 'stack-queue',
    name: '📚 栈与队列 Stack & Queue',
    icon: '📚',
    description: '单调栈、括号匹配、BFS队列、计算器',
    problems: [
      { id: '20', num: 20, title: 'Valid Parentheses', difficulty: 'Easy', category: 'stack-queue', tags: ['stack', 'string'], url: 'https://leetcode.com/problems/valid-parentheses/' },
      { id: '42', num: 42, title: 'Trapping Rain Water', difficulty: 'Hard', category: 'stack-queue', tags: ['stack', 'two-pointers', 'dp'], url: 'https://leetcode.com/problems/trapping-rain-water/' },
      { id: '84', num: 84, title: 'Largest Rectangle in Histogram', difficulty: 'Hard', category: 'stack-queue', tags: ['stack', 'monotone-stack'], url: 'https://leetcode.com/problems/largest-rectangle-in-histogram/' },
      { id: '155', num: 155, title: 'Min Stack', difficulty: 'Medium', category: 'stack-queue', tags: ['stack', 'design'], url: 'https://leetcode.com/problems/min-stack/' },
      { id: '227', num: 227, title: 'Basic Calculator II', difficulty: 'Medium', category: 'stack-queue', tags: ['stack', 'math', 'string'], url: 'https://leetcode.com/problems/basic-calculator-ii/' },
      { id: '394', num: 394, title: 'Decode String', difficulty: 'Medium', category: 'stack-queue', tags: ['stack', 'string', 'recursion'], url: 'https://leetcode.com/problems/decode-string/' },
    ]
  },
  {
    id: 'heap',
    name: '⛰️ 堆 Heap / Priority Queue',
    icon: '⛰️',
    description: '最大堆/最小堆、Top K问题、数据流处理',
    problems: [
      { id: '215', num: 215, title: 'Kth Largest Element in an Array', difficulty: 'Medium', category: 'heap', tags: ['heap', 'sorting', 'quick-select'], url: 'https://leetcode.com/problems/kth-largest-element-in-an-array/' },
      { id: '347', num: 347, title: 'Top K Frequent Elements', difficulty: 'Medium', category: 'heap', tags: ['heap', 'hash-table', 'bucket-sort'], url: 'https://leetcode.com/problems/top-k-frequent-elements/' },
      { id: '253', num: 253, title: 'Meeting Rooms II', difficulty: 'Medium', category: 'heap', tags: ['heap', 'sorting', 'greedy'], url: 'https://leetcode.com/problems/meeting-rooms-ii/' },
      { id: '295', num: 295, title: 'Find Median from Data Stream', difficulty: 'Hard', category: 'heap', tags: ['heap', 'design', 'two-pointers'], url: 'https://leetcode.com/problems/find-median-from-data-stream/' },
      { id: '621', num: 621, title: 'Task Scheduler', difficulty: 'Medium', category: 'heap', tags: ['heap', 'greedy', 'hash-table'], url: 'https://leetcode.com/problems/task-scheduler/' },
      { id: '973', num: 973, title: 'K Closest Points to Origin', difficulty: 'Medium', category: 'heap', tags: ['heap', 'sorting', 'geometry'], url: 'https://leetcode.com/problems/k-closest-points-to-origin/' },
    ]
  },
  {
    id: 'two-pointers',
    name: '👆👆 双指针 Two Pointers',
    icon: '👆',
    description: '相向/同向双指针，排序后双指针',
    problems: [
      { id: '15', num: 15, title: '3Sum', difficulty: 'Medium', category: 'two-pointers', tags: ['two-pointers', 'sorting', 'array'], url: 'https://leetcode.com/problems/3sum/' },
      { id: '11', num: 11, title: 'Container With Most Water', difficulty: 'Medium', category: 'two-pointers', tags: ['two-pointers', 'array', 'greedy'], url: 'https://leetcode.com/problems/container-with-most-water/' },
      { id: '167', num: 167, title: 'Two Sum II - Input Array Is Sorted', difficulty: 'Medium', category: 'two-pointers', tags: ['two-pointers', 'binary-search'], url: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/' },
      { id: '125', num: 125, title: 'Valid Palindrome', difficulty: 'Easy', category: 'two-pointers', tags: ['two-pointers', 'string'], url: 'https://leetcode.com/problems/valid-palindrome/' },
      { id: '75', num: 75, title: 'Sort Colors', difficulty: 'Medium', category: 'two-pointers', tags: ['two-pointers', 'sorting'], url: 'https://leetcode.com/problems/sort-colors/' },
    ]
  },
  {
    id: 'hash-table',
    name: '📏 哈希表 Hash Table',
    icon: '📏',
    description: '空间换时间，O(1)查找',
    problems: [
      { id: '1', num: 1, title: 'Two Sum', difficulty: 'Easy', category: 'hash-table', tags: ['hash-table', 'array'], url: 'https://leetcode.com/problems/two-sum/' },
      { id: '49', num: 49, title: 'Group Anagrams', difficulty: 'Medium', category: 'hash-table', tags: ['hash-table', 'string', 'sorting'], url: 'https://leetcode.com/problems/group-anagrams/' },
      { id: '128', num: 128, title: 'Longest Consecutive Sequence', difficulty: 'Medium', category: 'hash-table', tags: ['hash-table', 'array'], url: 'https://leetcode.com/problems/longest-consecutive-sequence/' },
      { id: '380', num: 380, title: 'Insert Delete GetRandom O(1)', difficulty: 'Medium', category: 'hash-table', tags: ['hash-table', 'array', 'design'], url: 'https://leetcode.com/problems/insert-delete-getrandom-o1/' },
      { id: '238', num: 238, title: 'Product of Array Except Self', difficulty: 'Medium', category: 'hash-table', tags: ['prefix-sum', 'array'], url: 'https://leetcode.com/problems/product-of-array-except-self/' },
      { id: '560', num: 560, title: 'Subarray Sum Equals K', difficulty: 'Medium', category: 'hash-table', tags: ['hash-table', 'prefix-sum'], url: 'https://leetcode.com/problems/subarray-sum-equals-k/' },
    ]
  },
  {
    id: 'trie',
    name: '📖 字典树 Trie',
    icon: '📖',
    description: '前缀树实现，字符串查找优化',
    problems: [
      { id: '208', num: 208, title: 'Implement Trie (Prefix Tree)', difficulty: 'Medium', category: 'trie', tags: ['trie', 'design'], url: 'https://leetcode.com/problems/implement-trie-prefix-tree/' },
      { id: '211', num: 211, title: 'Design Add and Search Words Data Structure', difficulty: 'Medium', category: 'trie', tags: ['trie', 'dfs', 'design'], url: 'https://leetcode.com/problems/design-add-and-search-words-data-structure/' },
      { id: '1268', num: 1268, title: 'Search Suggestions System', difficulty: 'Medium', category: 'trie', tags: ['trie', 'binary-search', 'string'], url: 'https://leetcode.com/problems/search-suggestions-system/' },
    ]
  },
  {
    id: 'greedy',
    name: '💰 贪心 Greedy',
    icon: '💰',
    description: '局部最优推全局最优，数学证明',
    problems: [
      { id: '55', num: 55, title: 'Jump Game', difficulty: 'Medium', category: 'greedy', tags: ['greedy', 'dp'], url: 'https://leetcode.com/problems/jump-game/' },
      { id: '45', num: 45, title: 'Jump Game II', difficulty: 'Medium', category: 'greedy', tags: ['greedy', 'dp'], url: 'https://leetcode.com/problems/jump-game-ii/' },
      { id: '134', num: 134, title: 'Gas Station', difficulty: 'Medium', category: 'greedy', tags: ['greedy', 'array'], url: 'https://leetcode.com/problems/gas-station/' },
      { id: '435', num: 435, title: 'Non-overlapping Intervals', difficulty: 'Medium', category: 'greedy', tags: ['greedy', 'sorting'], url: 'https://leetcode.com/problems/non-overlapping-intervals/' },
      { id: '56', num: 56, title: 'Merge Intervals', difficulty: 'Medium', category: 'greedy', tags: ['sorting', 'array'], url: 'https://leetcode.com/problems/merge-intervals/' },
    ]
  },
  {
    id: 'union-find',
    name: '🔗 并查集 Union Find',
    icon: '🔗',
    description: '连通分量、路径压缩、按秩合并',
    problems: [
      { id: '547', num: 547, title: 'Number of Provinces', difficulty: 'Medium', category: 'union-find', tags: ['union-find', 'graph'], url: 'https://leetcode.com/problems/number-of-provinces/' },
      { id: '684', num: 684, title: 'Redundant Connection', difficulty: 'Medium', category: 'union-find', tags: ['union-find', 'graph'], url: 'https://leetcode.com/problems/redundant-connection/' },
      { id: '721', num: 721, title: 'Accounts Merge', difficulty: 'Medium', category: 'union-find', tags: ['union-find', 'dfs', 'string'], url: 'https://leetcode.com/problems/accounts-merge/' },
    ]
  },
];

// Flat map lookups
export const CATEGORIES_MAP: Record<string, LeetCodeCategory> = Object.fromEntries(
  LEETCODE_CATEGORIES.map(cat => [cat.id, cat])
);

export const FAMILIARITY_CONFIG: Record<Familiarity, { label: string; color: string; bgColor: string; description: string }> = {
  0: { label: '未做', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800', description: '尚未尝试' },
  1: { label: '又忘了', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-950', description: '做过但完全想不起来' },
  2: { label: '模糊', color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-950', description: '大致思路，细节不清' },
  3: { label: '熟悉', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-950', description: '能独立完成，偶有卡顿' },
  4: { label: '掌握', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950', description: '流畅完成，能优化' },
};

// ─────────────────────────────────────────────────────────────
// IMPORTANT: The LEETCODE_CATEGORIES array was extended below.
// The FAVORITE_CATEGORY is added separately and pushed in.
// ─────────────────────────────────────────────────────────────

const FAVORITE_CATEGORY: LeetCodeCategory = {
  id: 'favorite',
  name: '⭐ Favorite',
  icon: '⭐',
  description: '收藏的题目，可在此处添加、删除题目',
  problems: [
  { id: 'local-1', num: 1, title: "Two Sum", difficulty: 'Easy', category: 'favorite', tags: ["hash-table", "array"], url: "https://leetcode.com/problems/two-sum/" },
  { id: 'local-2', num: 2, title: "Add Two Numbers", difficulty: 'Medium', category: 'favorite', tags: ["linked-list"], url: "https://leetcode.com/problems/add-two-numbers/" },
  { id: 'local-5', num: 5, title: "Longest Palindromic Substring", difficulty: 'Medium', category: 'favorite', tags: ["dp", "string"], url: "https://leetcode.com/problems/longest-palindromic-substring/" },
  { id: 'local-9', num: 9, title: "Palindrome Number", difficulty: 'Easy', category: 'favorite', tags: ["math"], url: "https://leetcode.com/problems/palindrome-number/" },
  { id: 'local-10', num: 10, title: "Regular Expression Matching", difficulty: 'Hard', category: 'favorite', tags: ["dp", "string"], url: "https://leetcode.com/problems/regular-expression-matching/" },
  { id: 'local-11', num: 11, title: "Container With Most Water", difficulty: 'Medium', category: 'favorite', tags: ["two-pointers", "array"], url: "https://leetcode.com/problems/container-with-most-water/" },
  { id: 'local-13', num: 13, title: "Roman To Integer", difficulty: 'Easy', category: 'favorite', tags: ["math", "string"], url: "https://leetcode.com/problems/roman-to-integer/" },
  { id: 'local-14', num: 14, title: "Longest Common Prefix", difficulty: 'Easy', category: 'favorite', tags: ["string", "trie"], url: "https://leetcode.com/problems/longest-common-prefix/" },
  { id: 'local-17', num: 17, title: "Letter Combinations Of A Phone Number", difficulty: 'Medium', category: 'favorite', tags: ["backtracking", "string"], url: "https://leetcode.com/problems/letter-combinations-of-a-phone-number/" },
  { id: 'local-19', num: 19, title: "Remove Nth Node From End Of List", difficulty: 'Medium', category: 'favorite', tags: ["linked-list", "two-pointers"], url: "https://leetcode.com/problems/remove-nth-node-from-end-of-list/" },
  { id: 'local-20', num: 20, title: "Valid Parentheses", difficulty: 'Easy', category: 'favorite', tags: ["stack", "string"], url: "https://leetcode.com/problems/valid-parentheses/" },
  { id: 'local-23', num: 23, title: "Merge K Sorted Lists", difficulty: 'Hard', category: 'favorite', tags: ["linked-list", "heap"], url: "https://leetcode.com/problems/merge-k-sorted-lists/" },
  { id: 'local-25', num: 25, title: "Reverse Nodes In K Group", difficulty: 'Hard', category: 'favorite', tags: ["linked-list", "recursion"], url: "https://leetcode.com/problems/reverse-nodes-in-k-group/" },
  { id: 'local-26', num: 26, title: "Remove Duplicates From Sorted Array", difficulty: 'Easy', category: 'favorite', tags: ["two-pointers", "array"], url: "https://leetcode.com/problems/remove-duplicates-from-sorted-array/" },
  { id: 'local-27', num: 27, title: "Remove Element", difficulty: 'Easy', category: 'favorite', tags: ["two-pointers", "array"], url: "https://leetcode.com/problems/remove-element/" },
  { id: 'local-28', num: 28, title: "Implement Strstr", difficulty: 'Easy', category: 'favorite', tags: ["string", "kmp"], url: "https://leetcode.com/problems/implement-strstr/" },
  { id: 'local-29', num: 29, title: "Divide Two Integers", difficulty: 'Medium', category: 'favorite', tags: ["math", "bit-manipulation"], url: "https://leetcode.com/problems/divide-two-integers/" },
  { id: 'local-30', num: 30, title: "Count And Say", difficulty: 'Medium', category: 'favorite', tags: ["array"], url: "https://leetcode.com/problems/count-and-say/" },
  { id: 'local-33', num: 33, title: "Search In Rotated Sorted Array", difficulty: 'Medium', category: 'favorite', tags: ["binary-search", "array"], url: "https://leetcode.com/problems/search-in-rotated-sorted-array/" },
  { id: 'local-34', num: 34, title: "Find First And Last Position Of Element In Sorted Array", difficulty: 'Medium', category: 'favorite', tags: ["binary-search", "array"], url: "https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/" },
  { id: 'local-35', num: 35, title: "Search Insert Position", difficulty: 'Easy', category: 'favorite', tags: ["binary-search", "array"], url: "https://leetcode.com/problems/search-insert-position/" },
  { id: 'local-36', num: 36, title: "Valid Sudoku", difficulty: 'Medium', category: 'favorite', tags: ["hash-table", "matrix"], url: "https://leetcode.com/problems/valid-sudoku/" },
  { id: 'local-38', num: 38, title: "Count And Say", difficulty: 'Medium', category: 'favorite', tags: ["array"], url: "https://leetcode.com/problems/count-and-say/" },
  { id: 'local-39', num: 39, title: "Combination Sum", difficulty: 'Medium', category: 'favorite', tags: ["backtracking", "array"], url: "https://leetcode.com/problems/combination-sum/" },
  { id: 'local-40', num: 40, title: "Combination Sum Ii", difficulty: 'Medium', category: 'favorite', tags: ["backtracking", "array"], url: "https://leetcode.com/problems/combination-sum-ii/" },
  { id: 'local-42', num: 42, title: "Trapping Rain Water", difficulty: 'Hard', category: 'favorite', tags: ["stack", "two-pointers", "dp"], url: "https://leetcode.com/problems/trapping-rain-water/" },
  { id: 'local-43', num: 43, title: "Multiply Strings", difficulty: 'Medium', category: 'favorite', tags: ["math", "string"], url: "https://leetcode.com/problems/multiply-strings/" },
  { id: 'local-44', num: 44, title: "Wildcard Matching", difficulty: 'Hard', category: 'favorite', tags: ["dp", "greedy"], url: "https://leetcode.com/problems/wildcard-matching/" },
  { id: 'local-45', num: 45, title: "Jump Game Ii", difficulty: 'Medium', category: 'favorite', tags: ["greedy", "dp"], url: "https://leetcode.com/problems/jump-game-ii/" },
  { id: 'local-46', num: 46, title: "Permutations", difficulty: 'Medium', category: 'favorite', tags: ["backtracking", "array"], url: "https://leetcode.com/problems/permutations/" },
  { id: 'local-49', num: 49, title: "Group Anagrams", difficulty: 'Medium', category: 'favorite', tags: ["hash-table", "string", "sorting"], url: "https://leetcode.com/problems/group-anagrams/" },
  { id: 'local-50', num: 50, title: "Pow X N", difficulty: 'Medium', category: 'favorite', tags: ["math", "recursion"], url: "https://leetcode.com/problems/pow-x-n/" },
  { id: 'local-53', num: 53, title: "Maximum Subarray", difficulty: 'Medium', category: 'favorite', tags: ["dp", "array"], url: "https://leetcode.com/problems/maximum-subarray/" },
  { id: 'local-54', num: 54, title: "Spiral Matrix", difficulty: 'Medium', category: 'favorite', tags: ["matrix", "simulation"], url: "https://leetcode.com/problems/spiral-matrix/" },
  { id: 'local-55', num: 55, title: "Jump Game", difficulty: 'Medium', category: 'favorite', tags: ["greedy", "dp"], url: "https://leetcode.com/problems/jump-game/" },
  { id: 'local-56', num: 56, title: "Merge Intervals", difficulty: 'Medium', category: 'favorite', tags: ["sorting", "array"], url: "https://leetcode.com/problems/merge-intervals/" },
  { id: 'local-57', num: 57, title: "Insert Interval", difficulty: 'Medium', category: 'favorite', tags: ["array"], url: "https://leetcode.com/problems/insert-interval/" },
  { id: 'local-61', num: 61, title: "Rotate List", difficulty: 'Medium', category: 'favorite', tags: ["array"], url: "https://leetcode.com/problems/rotate-list/" },
  { id: 'local-62', num: 62, title: "Unique Paths", difficulty: 'Medium', category: 'favorite', tags: ["dp", "math"], url: "https://leetcode.com/problems/unique-paths/" },
  { id: 'local-63', num: 63, title: "Unique Paths Ii", difficulty: 'Medium', category: 'favorite', tags: ["dp"], url: "https://leetcode.com/problems/unique-paths-ii/" },
  { id: 'local-64', num: 64, title: "Minimum Path Sum", difficulty: 'Medium', category: 'favorite', tags: ["dp"], url: "https://leetcode.com/problems/minimum-path-sum/" },
  { id: 'local-66', num: 66, title: "Plus One", difficulty: 'Easy', category: 'favorite', tags: ["array", "math"], url: "https://leetcode.com/problems/plus-one/" },
  { id: 'local-67', num: 67, title: "Add Binary", difficulty: 'Easy', category: 'favorite', tags: ["math", "string"], url: "https://leetcode.com/problems/add-binary/" },
  { id: 'local-68', num: 68, title: "Text Justification", difficulty: 'Hard', category: 'favorite', tags: ["string"], url: "https://leetcode.com/problems/text-justification/" },
  { id: 'local-69', num: 69, title: "Sqrt X", difficulty: 'Easy', category: 'favorite', tags: ["math", "binary-search"], url: "https://leetcode.com/problems/sqrt-x/" },
  { id: 'local-70', num: 70, title: "Climbing Stairs", difficulty: 'Easy', category: 'favorite', tags: ["dp", "math"], url: "https://leetcode.com/problems/climbing-stairs/" },
  { id: 'local-71', num: 71, title: "Simplify Path", difficulty: 'Medium', category: 'favorite', tags: ["stack", "string"], url: "https://leetcode.com/problems/simplify-path/" },
  { id: 'local-72', num: 72, title: "Edit Distance", difficulty: 'Medium', category: 'favorite', tags: ["dp", "string"], url: "https://leetcode.com/problems/edit-distance/" },
  { id: 'local-73', num: 73, title: "Set Matrix Zeroes", difficulty: 'Medium', category: 'favorite', tags: ["matrix", "hash-table"], url: "https://leetcode.com/problems/set-matrix-zeroes/" },
  { id: 'local-75', num: 75, title: "Sort Colors", difficulty: 'Medium', category: 'favorite', tags: ["two-pointers", "sorting"], url: "https://leetcode.com/problems/sort-colors/" },
  { id: 'local-76', num: 76, title: "Minimum Window Substring", difficulty: 'Hard', category: 'favorite', tags: ["sliding-window", "hash-table"], url: "https://leetcode.com/problems/minimum-window-substring/" },
  { id: 'local-78', num: 78, title: "Subsets", difficulty: 'Medium', category: 'favorite', tags: ["backtracking", "array"], url: "https://leetcode.com/problems/subsets/" },
  { id: 'local-79', num: 79, title: "Word Search", difficulty: 'Medium', category: 'favorite', tags: ["backtracking", "dfs", "grid"], url: "https://leetcode.com/problems/word-search/" },
  { id: 'local-80', num: 80, title: "Remove Duplicates From Sorted Array Ii", difficulty: 'Medium', category: 'favorite', tags: ["two-pointers", "array"], url: "https://leetcode.com/problems/remove-duplicates-from-sorted-array-ii/" },
  { id: 'local-83', num: 83, title: "Remove Duplicates From Sorted List", difficulty: 'Easy', category: 'favorite', tags: ["linked-list"], url: "https://leetcode.com/problems/remove-duplicates-from-sorted-list/" },
  { id: 'local-88', num: 88, title: "Merge Sorted Array", difficulty: 'Easy', category: 'favorite', tags: ["two-pointers", "sorting"], url: "https://leetcode.com/problems/merge-sorted-array/" },
  { id: 'local-91', num: 91, title: "Decode Ways", difficulty: 'Medium', category: 'favorite', tags: ["dp", "string"], url: "https://leetcode.com/problems/decode-ways/" },
  { id: 'local-94', num: 94, title: "Binary Tree Inorder Traversal", difficulty: 'Easy', category: 'favorite', tags: ["tree", "dfs"], url: "https://leetcode.com/problems/binary-tree-inorder-traversal/" },
  { id: 'local-98', num: 98, title: "Valid Binary Search Tree", difficulty: 'Medium', category: 'favorite', tags: ["tree", "bst", "dfs"], url: "https://leetcode.com/problems/valid-binary-search-tree/" },
  { id: 'local-100', num: 100, title: "Same Tree", difficulty: 'Easy', category: 'favorite', tags: ["tree", "dfs"], url: "https://leetcode.com/problems/same-tree/" },
  { id: 'local-101', num: 101, title: "Symmetric Tree", difficulty: 'Easy', category: 'favorite', tags: ["tree", "bfs", "dfs"], url: "https://leetcode.com/problems/symmetric-tree/" },
  { id: 'local-102', num: 102, title: "Binary Tree Level Order Traversal", difficulty: 'Medium', category: 'favorite', tags: ["tree", "bfs"], url: "https://leetcode.com/problems/binary-tree-level-order-traversal/" },
  { id: 'local-103', num: 103, title: "Binary Tree Zigzag Level Order Traversal", difficulty: 'Medium', category: 'favorite', tags: ["tree", "bfs"], url: "https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/" },
  { id: 'local-104', num: 104, title: "Maximum Depth Of Binary Tree", difficulty: 'Easy', category: 'favorite', tags: ["tree", "dfs"], url: "https://leetcode.com/problems/maximum-depth-of-binary-tree/" },
  { id: 'local-105', num: 105, title: "Construct Binary Tree From Preorder And Inorder Traversal", difficulty: 'Medium', category: 'favorite', tags: ["tree", "array", "dfs"], url: "https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/" },
  { id: 'local-106', num: 106, title: "Construct Binary Tree From Inorder And Postorder Traversal", difficulty: 'Medium', category: 'favorite', tags: ["tree", "array", "dfs"], url: "https://leetcode.com/problems/construct-binary-tree-from-inorder-and-postorder-traversal/" },
  { id: 'local-108', num: 108, title: "Convert Sorted Array To Binary Search Tree", difficulty: 'Easy', category: 'favorite', tags: ["tree", "bst"], url: "https://leetcode.com/problems/convert-sorted-array-to-binary-search-tree/" },
  { id: 'local-110', num: 110, title: "Balanced Binary Tree", difficulty: 'Easy', category: 'favorite', tags: ["tree", "dfs"], url: "https://leetcode.com/problems/balanced-binary-tree/" },
  { id: 'local-112', num: 112, title: "Path Sum", difficulty: 'Easy', category: 'favorite', tags: ["tree", "dfs"], url: "https://leetcode.com/problems/path-sum/" },
  { id: 'local-117', num: 117, title: "Populating Next Right Pointers In Each Node Ii", difficulty: 'Medium', category: 'favorite', tags: ["tree", "bfs"], url: "https://leetcode.com/problems/populating-next-right-pointers-in-each-node-ii/" },
  { id: 'local-120', num: 120, title: "Triangle", difficulty: 'Medium', category: 'favorite', tags: ["dp"], url: "https://leetcode.com/problems/triangle/" },
  { id: 'local-121', num: 121, title: "Best Time To Buy And Sell Stock", difficulty: 'Easy', category: 'favorite', tags: ["dp", "array"], url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/" },
  { id: 'local-122', num: 122, title: "Best Time To Buy And Sell Stock Ii", difficulty: 'Medium', category: 'favorite', tags: ["dp", "greedy"], url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock-ii/" },
  { id: 'local-123', num: 123, title: "Best Time To Buy And Sell Stock Iii", difficulty: 'Hard', category: 'favorite', tags: ["dp"], url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iii/" },
  { id: 'local-124', num: 124, title: "Binary Tree Maximum Path Sum", difficulty: 'Hard', category: 'favorite', tags: ["tree", "dfs", "dp"], url: "https://leetcode.com/problems/binary-tree-maximum-path-sum/" },
  { id: 'local-127', num: 127, title: "Word Ladder", difficulty: 'Hard', category: 'favorite', tags: ["bfs", "hash-table"], url: "https://leetcode.com/problems/word-ladder/" },
  { id: 'local-128', num: 128, title: "Longest Consecutive Sequence", difficulty: 'Medium', category: 'favorite', tags: ["hash-table", "union-find"], url: "https://leetcode.com/problems/longest-consecutive-sequence/" },
  { id: 'local-129', num: 129, title: "Sum Root To Leaf Numbers", difficulty: 'Medium', category: 'favorite', tags: ["tree", "dfs"], url: "https://leetcode.com/problems/sum-root-to-leaf-numbers/" },
  { id: 'local-133', num: 133, title: "Clone Graph", difficulty: 'Medium', category: 'favorite', tags: ["graph", "bfs", "dfs"], url: "https://leetcode.com/problems/clone-graph/" },
  { id: 'local-134', num: 134, title: "Gas Station", difficulty: 'Medium', category: 'favorite', tags: ["greedy", "array"], url: "https://leetcode.com/problems/gas-station/" },
  { id: 'local-135', num: 135, title: "Candy", difficulty: 'Hard', category: 'favorite', tags: ["greedy", "array"], url: "https://leetcode.com/problems/candy/" },
  { id: 'local-141', num: 141, title: "Linked List Cycle", difficulty: 'Easy', category: 'favorite', tags: ["linked-list", "two-pointers"], url: "https://leetcode.com/problems/linked-list-cycle/" },
  { id: 'local-143', num: 143, title: "Reorder List", difficulty: 'Medium', category: 'favorite', tags: ["linked-list", "two-pointers"], url: "https://leetcode.com/problems/reorder-list/" },
  { id: 'local-144', num: 144, title: "Binary Tree Preorder Traversal", difficulty: 'Easy', category: 'favorite', tags: ["tree", "dfs", "stack"], url: "https://leetcode.com/problems/binary-tree-preorder-traversal/" },
  { id: 'local-146', num: 146, title: "Lru Cache", difficulty: 'Medium', category: 'favorite', tags: ["hash-table", "linked-list", "design"], url: "https://leetcode.com/problems/lru-cache/" },
  { id: 'local-150', num: 150, title: "Evaluate Reverse Polish Notation", difficulty: 'Medium', category: 'favorite', tags: ["stack", "math"], url: "https://leetcode.com/problems/evaluate-reverse-polish-notation/" },
  { id: 'local-153', num: 153, title: "Find Minimum In Rotated Sorted Array", difficulty: 'Medium', category: 'favorite', tags: ["binary-search", "array"], url: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/" },
  { id: 'local-157', num: 157, title: "Read N Char Give Read4", difficulty: 'Easy', category: 'favorite', tags: ["string", "design"], url: "https://leetcode.com/problems/read-n-char-give-read4/" },
  { id: 'local-158', num: 158, title: "Read N Char Give Read4 Ii", difficulty: 'Hard', category: 'favorite', tags: ["string", "design"], url: "https://leetcode.com/problems/read-n-char-give-read4-ii/" },
  { id: 'local-160', num: 160, title: "Intersection Of Two Linked Lists", difficulty: 'Easy', category: 'favorite', tags: ["linked-list", "two-pointers"], url: "https://leetcode.com/problems/intersection-of-two-linked-lists/" },
  { id: 'local-161', num: 161, title: "One Edit Distance", difficulty: 'Medium', category: 'favorite', tags: ["string", "dp"], url: "https://leetcode.com/problems/one-edit-distance/" },
  { id: 'local-162', num: 162, title: "Find Peak Element", difficulty: 'Medium', category: 'favorite', tags: ["binary-search", "array"], url: "https://leetcode.com/problems/find-peak-element/" },
  { id: 'local-167', num: 167, title: "Two Sum Ii Input Array Is Sorted", difficulty: 'Medium', category: 'favorite', tags: ["two-pointers", "binary-search"], url: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/" },
  { id: 'local-168', num: 168, title: "Excel Sheet Column Title", difficulty: 'Easy', category: 'favorite', tags: ["math", "string"], url: "https://leetcode.com/problems/excel-sheet-column-title/" },
  { id: 'local-169', num: 169, title: "Majority Element", difficulty: 'Easy', category: 'favorite', tags: ["array", "sorting"], url: "https://leetcode.com/problems/majority-element/" },
  { id: 'local-173', num: 173, title: "Binary Search Tree Iterator", difficulty: 'Medium', category: 'favorite', tags: ["tree", "bst", "design"], url: "https://leetcode.com/problems/binary-search-tree-iterator/" },
  { id: 'local-189', num: 189, title: "Rotate Array", difficulty: 'Medium', category: 'favorite', tags: ["array", "two-pointers", "math"], url: "https://leetcode.com/problems/rotate-array/" },
  { id: 'local-198', num: 198, title: "House Robber", difficulty: 'Medium', category: 'favorite', tags: ["dp"], url: "https://leetcode.com/problems/house-robber/" },
  { id: 'local-203', num: 203, title: "Remove Linked List Elements", difficulty: 'Easy', category: 'favorite', tags: ["linked-list"], url: "https://leetcode.com/problems/remove-linked-list-elements/" },
  { id: 'local-205', num: 205, title: "Isomorphic Strings", difficulty: 'Easy', category: 'favorite', tags: ["hash-table", "string"], url: "https://leetcode.com/problems/isomorphic-strings/" },
  { id: 'local-206', num: 206, title: "Reverse Linked List", difficulty: 'Easy', category: 'favorite', tags: ["linked-list", "recursion"], url: "https://leetcode.com/problems/reverse-linked-list/" },
  { id: 'local-207', num: 207, title: "Course Schedule", difficulty: 'Medium', category: 'favorite', tags: ["graph", "topological-sort"], url: "https://leetcode.com/problems/course-schedule/" },
  { id: 'local-208', num: 208, title: "Implement Trie Prefix Tree", difficulty: 'Medium', category: 'favorite', tags: ["trie", "design"], url: "https://leetcode.com/problems/implement-trie-prefix-tree/" },
  { id: 'local-209', num: 209, title: "Minimum Size Subarray Sum", difficulty: 'Medium', category: 'favorite', tags: ["sliding-window", "two-pointers"], url: "https://leetcode.com/problems/minimum-size-subarray-sum/" },
  { id: 'local-210', num: 210, title: "Course Schedule Ii", difficulty: 'Medium', category: 'favorite', tags: ["graph", "topological-sort"], url: "https://leetcode.com/problems/course-schedule-ii/" },
  { id: 'local-211', num: 211, title: "Add And Search Word", difficulty: 'Medium', category: 'favorite', tags: ["trie", "dfs", "design"], url: "https://leetcode.com/problems/add-and-search-word/" },
  { id: 'local-212', num: 212, title: "Word Search Ii", difficulty: 'Hard', category: 'favorite', tags: ["trie", "backtracking", "grid"], url: "https://leetcode.com/problems/word-search-ii/" },
  { id: 'local-213', num: 213, title: "House Robber Ii", difficulty: 'Medium', category: 'favorite', tags: ["dp"], url: "https://leetcode.com/problems/house-robber-ii/" },
  { id: 'local-215', num: 215, title: "Kth Largest Element In An Array", difficulty: 'Medium', category: 'favorite', tags: ["heap", "sorting", "quick-select"], url: "https://leetcode.com/problems/kth-largest-element-in-an-array/" },
  { id: 'local-216', num: 216, title: "Combination Sum Iii", difficulty: 'Medium', category: 'favorite', tags: ["backtracking", "array"], url: "https://leetcode.com/problems/combination-sum-iii/" },
  { id: 'local-218', num: 218, title: "The Skyline Problem", difficulty: 'Hard', category: 'favorite', tags: ["heap", "sorting", "sweep-line"], url: "https://leetcode.com/problems/the-skyline-problem/" },
  { id: 'local-219', num: 219, title: "Contains Duplicate Ii", difficulty: 'Easy', category: 'favorite', tags: ["hash-table", "sliding-window"], url: "https://leetcode.com/problems/contains-duplicate-ii/" },
  { id: 'local-221', num: 221, title: "Maximal Square", difficulty: 'Medium', category: 'favorite', tags: ["dp", "matrix"], url: "https://leetcode.com/problems/maximal-square/" },
  { id: 'local-225', num: 225, title: "Implement Stack Using Queues", difficulty: 'Easy', category: 'favorite', tags: ["stack", "design"], url: "https://leetcode.com/problems/implement-stack-using-queues/" },
  { id: 'local-226', num: 226, title: "Invert Binary Tree", difficulty: 'Easy', category: 'favorite', tags: ["tree", "dfs"], url: "https://leetcode.com/problems/invert-binary-tree/" },
  { id: 'local-228', num: 228, title: "Summary Ranges", difficulty: 'Easy', category: 'favorite', tags: ["array"], url: "https://leetcode.com/problems/summary-ranges/" },
  { id: 'local-230', num: 230, title: "Kth Smallest Element In A Bst", difficulty: 'Medium', category: 'favorite', tags: ["tree", "bst", "dfs"], url: "https://leetcode.com/problems/kth-smallest-element-in-a-bst/" },
  { id: 'local-234', num: 234, title: "Palindrome Linked List", difficulty: 'Easy', category: 'favorite', tags: ["linked-list", "two-pointers"], url: "https://leetcode.com/problems/palindrome-linked-list/" },
  { id: 'local-235', num: 235, title: "Lowest Common Ancestor Of A Binary Search Tree", difficulty: 'Medium', category: 'favorite', tags: ["tree", "bst"], url: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/" },
  { id: 'local-237', num: 237, title: "Delete Node In A Linked List", difficulty: 'Easy', category: 'favorite', tags: ["linked-list"], url: "https://leetcode.com/problems/delete-node-in-a-linked-list/" },
  { id: 'local-238', num: 238, title: "Product Of Array Except Self", difficulty: 'Medium', category: 'favorite', tags: ["prefix-sum", "array"], url: "https://leetcode.com/problems/product-of-array-except-self/" },
  { id: 'local-242', num: 242, title: "Valid Anagram", difficulty: 'Easy', category: 'favorite', tags: ["hash-table", "string"], url: "https://leetcode.com/problems/valid-anagram/" },
  { id: 'local-252', num: 252, title: "Meeting Rooms", difficulty: 'Easy', category: 'favorite', tags: ["sorting", "greedy"], url: "https://leetcode.com/problems/meeting-rooms/" },
  { id: 'local-253', num: 253, title: "Meeting Rooms Ii", difficulty: 'Medium', category: 'favorite', tags: ["heap", "sorting", "greedy"], url: "https://leetcode.com/problems/meeting-rooms-ii/" },
  { id: 'local-256', num: 256, title: "Paint House", difficulty: 'Medium', category: 'favorite', tags: ["dp"], url: "https://leetcode.com/problems/paint-house/" },
  { id: 'local-257', num: 257, title: "Binary Tree Paths", difficulty: 'Easy', category: 'favorite', tags: ["tree", "dfs", "string"], url: "https://leetcode.com/problems/binary-tree-paths/" },
  { id: 'local-259', num: 259, title: "3 Sum Smaller", difficulty: 'Medium', category: 'favorite', tags: ["two-pointers", "sorting"], url: "https://leetcode.com/problems/3-sum-smaller/" },
  { id: 'local-261', num: 261, title: "Graph Valid Tree", difficulty: 'Medium', category: 'favorite', tags: ["graph", "union-find", "dfs"], url: "https://leetcode.com/problems/graph-valid-tree/" },
  { id: 'local-264', num: 264, title: "Ugly Number Ii", difficulty: 'Medium', category: 'favorite', tags: ["dp", "heap"], url: "https://leetcode.com/problems/ugly-number-ii/" },
  { id: 'local-268', num: 268, title: "Missing Number", difficulty: 'Easy', category: 'favorite', tags: ["math", "array"], url: "https://leetcode.com/problems/missing-number/" },
  { id: 'local-269', num: 269, title: "Alien Dictionary", difficulty: 'Hard', category: 'favorite', tags: ["graph", "topological-sort"], url: "https://leetcode.com/problems/alien-dictionary/" },
  { id: 'local-270', num: 270, title: "Closest Binary Search Tree Value", difficulty: 'Easy', category: 'favorite', tags: ["tree", "bst"], url: "https://leetcode.com/problems/closest-binary-search-tree-value/" },
  { id: 'local-274', num: 274, title: "H Index", difficulty: 'Medium', category: 'favorite', tags: ["array", "sorting"], url: "https://leetcode.com/problems/h-index/" },
  { id: 'local-275', num: 275, title: "H Index Ii", difficulty: 'Medium', category: 'favorite', tags: ["array", "binary-search"], url: "https://leetcode.com/problems/h-index-ii/" },
  { id: 'local-276', num: 276, title: "Paint Fence", difficulty: 'Medium', category: 'favorite', tags: ["dp"], url: "https://leetcode.com/problems/paint-fence/" },
  { id: 'local-277', num: 277, title: "Find The Celebrity", difficulty: 'Medium', category: 'favorite', tags: ["graph"], url: "https://leetcode.com/problems/find-the-celebrity/" },
  { id: 'local-278', num: 278, title: "First Bad Version", difficulty: 'Easy', category: 'favorite', tags: ["binary-search"], url: "https://leetcode.com/problems/first-bad-version/" },
  { id: 'local-279', num: 279, title: "Perfect Squares", difficulty: 'Medium', category: 'favorite', tags: ["dp", "bfs", "math"], url: "https://leetcode.com/problems/perfect-squares/" },
  { id: 'local-283', num: 283, title: "Move Zeroes", difficulty: 'Easy', category: 'favorite', tags: ["array", "two-pointers"], url: "https://leetcode.com/problems/move-zeroes/" },
  { id: 'local-285', num: 285, title: "Inorder Successsor In Bst", difficulty: 'Medium', category: 'favorite', tags: ["tree", "bst"], url: "https://leetcode.com/problems/inorder-successsor-in-bst/" },
  { id: 'local-286', num: 286, title: "Walls And Gates", difficulty: 'Medium', category: 'favorite', tags: ["bfs", "grid"], url: "https://leetcode.com/problems/walls-and-gates/" },
  { id: 'local-290', num: 290, title: "Word Pattern", difficulty: 'Easy', category: 'favorite', tags: ["hash-table", "string"], url: "https://leetcode.com/problems/word-pattern/" },
  { id: 'local-295', num: 295, title: "Find Median From Data Stream", difficulty: 'Hard', category: 'favorite', tags: ["heap", "design", "two-pointers"], url: "https://leetcode.com/problems/find-median-from-data-stream/" },
  { id: 'local-297', num: 297, title: "Serialize And Deserialize Binary Tree", difficulty: 'Hard', category: 'favorite', tags: ["tree", "bfs", "design"], url: "https://leetcode.com/problems/serialize-and-deserialize-binary-tree/" },
  { id: 'local-300', num: 300, title: "Longest Increasing Subsequence", difficulty: 'Medium', category: 'favorite', tags: ["dp", "binary-search"], url: "https://leetcode.com/problems/longest-increasing-subsequence/" },
  { id: 'local-301', num: 301, title: "Remove Invalid Parentheses", difficulty: 'Hard', category: 'favorite', tags: ["backtracking", "bfs", "string"], url: "https://leetcode.com/problems/remove-invalid-parentheses/" },
  { id: 'local-303', num: 303, title: "Range Sum Query", difficulty: 'Easy', category: 'favorite', tags: ["prefix-sum", "design"], url: "https://leetcode.com/problems/range-sum-query/" },
  { id: 'local-307', num: 307, title: "Range Sum Query Mutable", difficulty: 'Medium', category: 'favorite', tags: ["segment-tree", "binary-indexed-tree"], url: "https://leetcode.com/problems/range-sum-query-mutable/" },
  { id: 'local-309', num: 309, title: "Best Time To Buy And Sell Stock With Cooldown", difficulty: 'Medium', category: 'favorite', tags: ["dp"], url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/" },
  { id: 'local-311', num: 311, title: "Sparse Matrix Multiplication", difficulty: 'Medium', category: 'favorite', tags: ["hash-table", "matrix"], url: "https://leetcode.com/problems/sparse-matrix-multiplication/" },
  { id: 'local-314', num: 314, title: "Binary Tree Vertical Order Traversal", difficulty: 'Medium', category: 'favorite', tags: ["tree", "bfs"], url: "https://leetcode.com/problems/binary-tree-vertical-order-traversal/" },
  { id: 'local-322', num: 322, title: "Coin Change", difficulty: 'Medium', category: 'favorite', tags: ["dp", "bfs"], url: "https://leetcode.com/problems/coin-change/" },
  { id: 'local-323', num: 323, title: "Number Of Connected Components In An Undirected Graph", difficulty: 'Medium', category: 'favorite', tags: ["graph", "union-find"], url: "https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/" },
  { id: 'local-325', num: 325, title: "Maximum Size Subarray Sum Equals K", difficulty: 'Medium', category: 'favorite', tags: ["hash-table", "prefix-sum"], url: "https://leetcode.com/problems/maximum-size-subarray-sum-equals-k/" },
  { id: 'local-334', num: 334, title: "Increasing Triplet Subsequence", difficulty: 'Medium', category: 'favorite', tags: ["greedy", "array"], url: "https://leetcode.com/problems/increasing-triplet-subsequence/" },
  { id: 'local-341', num: 341, title: "Flatten Nested List Iterator", difficulty: 'Medium', category: 'favorite', tags: ["stack", "design", "recursion"], url: "https://leetcode.com/problems/flatten-nested-list-iterator/" },
  { id: 'local-345', num: 345, title: "Reverse Vowels Of A String", difficulty: 'Easy', category: 'favorite', tags: ["two-pointers", "string"], url: "https://leetcode.com/problems/reverse-vowels-of-a-string/" },
  { id: 'local-347', num: 347, title: "Top K Frequent Elements", difficulty: 'Medium', category: 'favorite', tags: ["heap", "hash-table", "bucket-sort"], url: "https://leetcode.com/problems/top-k-frequent-elements/" },
  { id: 'local-349', num: 349, title: "Intersection Of Two Arrays", difficulty: 'Easy', category: 'favorite', tags: ["hash-table", "sorting"], url: "https://leetcode.com/problems/intersection-of-two-arrays/" },
  { id: 'local-351', num: 351, title: "Android Unlock Patterns", difficulty: 'Medium', category: 'favorite', tags: ["backtracking", "dfs"], url: "https://leetcode.com/problems/android-unlock-patterns/" },
  { id: 'local-374', num: 374, title: "Guess Number Higher Or Lower", difficulty: 'Easy', category: 'favorite', tags: ["binary-search", "design"], url: "https://leetcode.com/problems/guess-number-higher-or-lower/" },
  { id: 'local-377', num: 377, title: "Combination Sum Iv", difficulty: 'Medium', category: 'favorite', tags: ["dp", "backtracking"], url: "https://leetcode.com/problems/combination-sum-iv/" },
  { id: 'local-378', num: 378, title: "Kth Smallest Element In A Sorted Matrix", difficulty: 'Medium', category: 'favorite', tags: ["binary-search", "heap"], url: "https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/" },
  { id: 'local-380', num: 380, title: "Insert Delete Getrandom O1", difficulty: 'Medium', category: 'favorite', tags: ["hash-table", "array", "design"], url: "https://leetcode.com/problems/insert-delete-getrandom-o1/" },
  { id: 'local-383', num: 383, title: "Ransom Note", difficulty: 'Easy', category: 'favorite', tags: ["hash-table", "string"], url: "https://leetcode.com/problems/ransom-note/" },
  { id: 'local-392', num: 392, title: "Is Subsequence", difficulty: 'Easy', category: 'favorite', tags: ["two-pointers", "string"], url: "https://leetcode.com/problems/is-subsequence/" },
  { id: 'local-394', num: 394, title: "Decode String", difficulty: 'Medium', category: 'favorite', tags: ["stack", "string", "recursion"], url: "https://leetcode.com/problems/decode-string/" },
  { id: 'local-398', num: 398, title: "Random Pick Index", difficulty: 'Medium', category: 'favorite', tags: ["hash-table", "math", "random"], url: "https://leetcode.com/problems/random-pick-index/" },
  { id: 'local-404', num: 404, title: "Sum Of Left Leaves", difficulty: 'Easy', category: 'favorite', tags: ["tree", "dfs"], url: "https://leetcode.com/problems/sum-of-left-leaves/" },
  { id: 'local-406', num: 406, title: "Queue Reconstruction By Height", difficulty: 'Medium', category: 'favorite', tags: ["sorting", "greedy"], url: "https://leetcode.com/problems/queue-reconstruction-by-height/" },
  { id: 'local-410', num: 410, title: "Split Array Largest Sum", difficulty: 'Hard', category: 'favorite', tags: ["binary-search", "dp"], url: "https://leetcode.com/problems/split-array-largest-sum/" },
  { id: 'local-413', num: 413, title: "Arithmetic Slices", difficulty: 'Medium', category: 'favorite', tags: ["dp", "math"], url: "https://leetcode.com/problems/arithmetic-slices/" },
  { id: 'local-415', num: 415, title: "Add Strings", difficulty: 'Easy', category: 'favorite', tags: ["string", "math"], url: "https://leetcode.com/problems/add-strings/" },
  { id: 'local-417', num: 417, title: "Pacific Atlantic Water Flow", difficulty: 'Medium', category: 'favorite', tags: ["dfs", "bfs", "grid"], url: "https://leetcode.com/problems/pacific-atlantic-water-flow/" },
  { id: 'local-426', num: 426, title: "Convert Binary Search Tree To Sorted Doubly Linked List", difficulty: 'Medium', category: 'favorite', tags: ["tree", "bst"], url: "https://leetcode.com/problems/convert-binary-search-tree-to-sorted-doubly-linked-list/" },
  { id: 'local-435', num: 435, title: "Non Overlapping Intervals", difficulty: 'Medium', category: 'favorite', tags: ["greedy", "sorting"], url: "https://leetcode.com/problems/non-overlapping-intervals/" },
  { id: 'local-438', num: 438, title: "Find All Anagrams In A String", difficulty: 'Medium', category: 'favorite', tags: ["sliding-window", "hash-table"], url: "https://leetcode.com/problems/find-all-anagrams-in-a-string/" },
  { id: 'local-448', num: 448, title: "Find All Numbers Disappeared In An Array", difficulty: 'Easy', category: 'favorite', tags: ["array"], url: "https://leetcode.com/problems/find-all-numbers-disappeared-in-an-array/" },
  { id: 'local-450', num: 450, title: "Delete Node In A Bst", difficulty: 'Medium', category: 'favorite', tags: ["tree", "bst"], url: "https://leetcode.com/problems/delete-node-in-a-bst/" },
  { id: 'local-452', num: 452, title: "Minimum Number Of Arrows To Burst Balloons", difficulty: 'Medium', category: 'favorite', tags: ["greedy", "sorting"], url: "https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/" },
  { id: 'local-455', num: 455, title: "Assign Cookies", difficulty: 'Easy', category: 'favorite', tags: ["greedy", "sorting"], url: "https://leetcode.com/problems/assign-cookies/" },
  { id: 'local-456', num: 456, title: "132 Pattern", difficulty: 'Medium', category: 'favorite', tags: ["stack", "array"], url: "https://leetcode.com/problems/132-pattern/" },
  { id: 'local-459', num: 459, title: "Repeated Substring Pattern", difficulty: 'Easy', category: 'favorite', tags: ["string", "kmp"], url: "https://leetcode.com/problems/repeated-substring-pattern/" },
  { id: 'local-461', num: 461, title: "Hamming Distance", difficulty: 'Easy', category: 'favorite', tags: ["bit-manipulation"], url: "https://leetcode.com/problems/hamming-distance/" },
  { id: 'local-477', num: 477, title: "Total Hamming Distance", difficulty: 'Medium', category: 'favorite', tags: ["bit-manipulation"], url: "https://leetcode.com/problems/total-hamming-distance/" },
  { id: 'local-494', num: 494, title: "Target Sum", difficulty: 'Medium', category: 'favorite', tags: ["dp", "backtracking"], url: "https://leetcode.com/problems/target-sum/" },
  { id: 'local-509', num: 509, title: "Fibonacci Number", difficulty: 'Easy', category: 'favorite', tags: ["dp", "recursion"], url: "https://leetcode.com/problems/fibonacci-number/" },
  { id: 'local-516', num: 516, title: "Longest Palindromic Subsequence", difficulty: 'Medium', category: 'favorite', tags: ["dp", "string"], url: "https://leetcode.com/problems/longest-palindromic-subsequence/" },
  { id: 'local-518', num: 518, title: "Coin Change 2", difficulty: 'Medium', category: 'favorite', tags: ["dp", "array"], url: "https://leetcode.com/problems/coin-change-2/" },
  { id: 'local-523', num: 523, title: "Continuous Subarray Sum", difficulty: 'Medium', category: 'favorite', tags: ["hash-table", "prefix-sum"], url: "https://leetcode.com/problems/continuous-subarray-sum/" },
  { id: 'local-538', num: 538, title: "Convert Bst To Greater Tree", difficulty: 'Medium', category: 'favorite', tags: ["tree", "bst"], url: "https://leetcode.com/problems/convert-bst-to-greater-tree/" },
  { id: 'local-540', num: 540, title: "Single Element In A Sorted Array", difficulty: 'Medium', category: 'favorite', tags: ["binary-search", "array"], url: "https://leetcode.com/problems/single-element-in-a-sorted-array/" },
  { id: 'local-543', num: 543, title: "Diameter Of Binary Tree", difficulty: 'Easy', category: 'favorite', tags: ["tree", "dfs"], url: "https://leetcode.com/problems/diameter-of-binary-tree/" },
  { id: 'local-547', num: 547, title: "Number Of Provinces", difficulty: 'Medium', category: 'favorite', tags: ["union-find", "dfs"], url: "https://leetcode.com/problems/number-of-provinces/" },
  { id: 'local-554', num: 554, title: "Brick Wall", difficulty: 'Medium', category: 'favorite', tags: ["hash-table", "array"], url: "https://leetcode.com/problems/brick-wall/" },
  { id: 'local-560', num: 560, title: "Subarray Sum Equals K", difficulty: 'Medium', category: 'favorite', tags: ["hash-table", "prefix-sum"], url: "https://leetcode.com/problems/subarray-sum-equals-k/" },
  { id: 'local-572', num: 572, title: "Subtree Of Another Tree", difficulty: 'Easy', category: 'favorite', tags: ["tree", "dfs", "string-matching"], url: "https://leetcode.com/problems/subtree-of-another-tree/" },
  { id: 'local-583', num: 583, title: "Delete Operation For Two Strings", difficulty: 'Medium', category: 'favorite', tags: ["dp", "string"], url: "https://leetcode.com/problems/delete-operation-for-two-strings/" },
  { id: 'local-617', num: 617, title: "Merge Two Binary Trees", difficulty: 'Easy', category: 'favorite', tags: ["tree", "dfs"], url: "https://leetcode.com/problems/merge-two-binary-trees/" },
  { id: 'local-621', num: 621, title: "Task Scheduler", difficulty: 'Medium', category: 'favorite', tags: ["heap", "greedy", "hash-table"], url: "https://leetcode.com/problems/task-scheduler/" },
  { id: 'local-636', num: 636, title: "Exclusive Time Of Functions", difficulty: 'Medium', category: 'favorite', tags: ["stack", "array"], url: "https://leetcode.com/problems/exclusive-time-of-functions/" },
  { id: 'local-637', num: 637, title: "Average Of Levels In Binary Tree", difficulty: 'Easy', category: 'favorite', tags: ["tree", "bfs"], url: "https://leetcode.com/problems/average-of-levels-in-binary-tree/" },
  { id: 'local-647', num: 647, title: "Palindromic Substrings", difficulty: 'Medium', category: 'favorite', tags: ["dp", "string"], url: "https://leetcode.com/problems/palindromic-substrings/" },
  { id: 'local-652', num: 652, title: "Find Duplicate Subtrees", difficulty: 'Medium', category: 'favorite', tags: ["tree", "hash-table"], url: "https://leetcode.com/problems/find-duplicate-subtrees/" },
  { id: 'local-654', num: 654, title: "Maximum Binary Tree", difficulty: 'Medium', category: 'favorite', tags: ["tree", "divide-conquer"], url: "https://leetcode.com/problems/maximum-binary-tree/" },
  { id: 'local-670', num: 670, title: "Maximum Swap", difficulty: 'Medium', category: 'favorite', tags: ["greedy", "math"], url: "https://leetcode.com/problems/maximum-swap/" },
  { id: 'local-673', num: 673, title: "Number Of Longest Increasing Subsequence", difficulty: 'Medium', category: 'favorite', tags: ["dp", "binary-search"], url: "https://leetcode.com/problems/number-of-longest-increasing-subsequence/" },
  { id: 'local-674', num: 674, title: "Longest Continuous Increasing Subsequence", difficulty: 'Easy', category: 'favorite', tags: ["dp", "array"], url: "https://leetcode.com/problems/longest-continuous-increasing-subsequence/" },
  { id: 'local-680', num: 680, title: "Valid Palindrome Ii", difficulty: 'Easy', category: 'favorite', tags: ["two-pointers", "string"], url: "https://leetcode.com/problems/valid-palindrome-ii/" },
  { id: 'local-692', num: 692, title: "Top K Frequent Words", difficulty: 'Medium', category: 'favorite', tags: ["heap", "hash-table"], url: "https://leetcode.com/problems/top-k-frequent-words/" },
  { id: 'local-700', num: 700, title: "Search In A Binary Search Tree", difficulty: 'Easy', category: 'favorite', tags: ["tree", "bst"], url: "https://leetcode.com/problems/search-in-a-binary-search-tree/" },
  { id: 'local-701', num: 701, title: "Insert Into A Binary Search Tree", difficulty: 'Medium', category: 'favorite', tags: ["tree", "bst"], url: "https://leetcode.com/problems/insert-into-a-binary-search-tree/" },
  { id: 'local-704', num: 704, title: "Binary Search", difficulty: 'Easy', category: 'favorite', tags: ["binary-search"], url: "https://leetcode.com/problems/binary-search/" },
  { id: 'local-714', num: 714, title: "Best Time To Buy And Sell Stock With Transaction Fee", difficulty: 'Medium', category: 'favorite', tags: ["dp", "greedy"], url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-transaction-fee/" },
  { id: 'local-717', num: 717, title: "1 Bit And 2 Bit Characters", difficulty: 'Easy', category: 'favorite', tags: ["array"], url: "https://leetcode.com/problems/1-bit-and-2-bit-characters/" },
  { id: 'local-745', num: 745, title: "Prefix And Suffix Search", difficulty: 'Hard', category: 'favorite', tags: ["trie", "design"], url: "https://leetcode.com/problems/prefix-and-suffix-search/" },
  { id: 'local-750', num: 750, title: "Number Of Corner Rectangles", difficulty: 'Medium', category: 'favorite', tags: ["dp", "math"], url: "https://leetcode.com/problems/number-of-corner-rectangles/" },
  { id: 'local-764', num: 764, title: "Largest Plus Sign", difficulty: 'Medium', category: 'favorite', tags: ["dp"], url: "https://leetcode.com/problems/largest-plus-sign/" },
  { id: 'local-785', num: 785, title: "Is Graph Bipartite", difficulty: 'Medium', category: 'favorite', tags: ["graph", "bfs", "dfs"], url: "https://leetcode.com/problems/is-graph-bipartite/" },
  { id: 'local-791', num: 791, title: "Custom Sort String", difficulty: 'Medium', category: 'favorite', tags: ["hash-table", "sorting"], url: "https://leetcode.com/problems/custom-sort-string/" },
  { id: 'local-852', num: 852, title: "Peak Index In A Mountain Array", difficulty: 'Easy', category: 'favorite', tags: ["binary-search", "array"], url: "https://leetcode.com/problems/peak-index-in-a-mountain-array/" },
  { id: 'local-876', num: 876, title: "Middle Of The Linked List", difficulty: 'Easy', category: 'favorite', tags: ["linked-list", "two-pointers"], url: "https://leetcode.com/problems/middle-of-the-linked-list/" },
  { id: 'local-912', num: 912, title: "Sort An Array", difficulty: 'Medium', category: 'favorite', tags: ["sorting", "divide-conquer", "heap"], url: "https://leetcode.com/problems/sort-an-array/" },
  { id: 'local-933', num: 933, title: "Number Of Recent Calls", difficulty: 'Easy', category: 'favorite', tags: ["queue", "design"], url: "https://leetcode.com/problems/number-of-recent-calls/" },
  { id: 'local-934', num: 934, title: "Shortest Bridge", difficulty: 'Medium', category: 'favorite', tags: ["bfs", "dfs", "grid"], url: "https://leetcode.com/problems/shortest-bridge/" },
  { id: 'local-938', num: 938, title: "Range Sum Of Bst", difficulty: 'Easy', category: 'favorite', tags: ["tree", "bst"], url: "https://leetcode.com/problems/range-sum-of-bst/" },
  { id: 'local-953', num: 953, title: "Verifying An Alien Dictionary", difficulty: 'Easy', category: 'favorite', tags: ["hash-table", "string"], url: "https://leetcode.com/problems/verifying-an-alien-dictionary/" },
  { id: 'local-986', num: 986, title: "Interval List Intersections", difficulty: 'Medium', category: 'favorite', tags: ["two-pointers", "array"], url: "https://leetcode.com/problems/interval-list-intersections/" },
  { id: 'local-987', num: 987, title: "Vertical Order Traversal Of A Binary Tree", difficulty: 'Hard', category: 'favorite', tags: ["tree", "bfs", "dfs"], url: "https://leetcode.com/problems/vertical-order-traversal-of-a-binary-tree/" },
  { id: 'local-1048', num: 1048, title: "Longest String Chain", difficulty: 'Medium', category: 'favorite', tags: ["dp", "hash-table"], url: "https://leetcode.com/problems/longest-string-chain/" },
  { id: 'local-1087', num: 1087, title: "Brace Expansion", difficulty: 'Medium', category: 'favorite', tags: ["backtracking", "string"], url: "https://leetcode.com/problems/brace-expansion/" },
  { id: 'local-1095', num: 1095, title: "Find In Mountain Array", difficulty: 'Hard', category: 'favorite', tags: ["binary-search", "design"], url: "https://leetcode.com/problems/find-in-mountain-array/" },
  { id: 'local-1143', num: 1143, title: "Longest Common Subsequence", difficulty: 'Medium', category: 'favorite', tags: ["dp", "string"], url: "https://leetcode.com/problems/longest-common-subsequence/" },
  { id: 'local-1446', num: 1446, title: "Consecutive Characters", difficulty: 'Easy', category: 'favorite', tags: ["string", "sliding-window"], url: "https://leetcode.com/problems/consecutive-characters/" },
  { id: 'local-1475', num: 1475, title: "Final Prices With A Special Discount In A Shop", difficulty: 'Easy', category: 'favorite', tags: ["stack", "array"], url: "https://leetcode.com/problems/final-prices-with-a-special-discount-in-a-shop/" },
  { id: 'local-1588', num: 1588, title: "Sum Of All Odd Length Subarrays", difficulty: 'Easy', category: 'favorite', tags: ["array", "prefix-sum"], url: "https://leetcode.com/problems/sum-of-all-odd-length-subarrays/" },
  { id: 'local-1752', num: 1752, title: "Check If Array Is Sorted And Rotated", difficulty: 'Easy', category: 'favorite', tags: ["array"], url: "https://leetcode.com/problems/check-if-array-is-sorted-and-rotated/" },
  { id: 'local-1762', num: 1762, title: "Buildings With An Ocean View", difficulty: 'Medium', category: 'favorite', tags: ["stack", "array"], url: "https://leetcode.com/problems/buildings-with-an-ocean-view/" },
  { id: 'local-1901', num: 1901, title: "Find A Peak Element Ii", difficulty: 'Medium', category: 'favorite', tags: ["binary-search", "matrix"], url: "https://leetcode.com/problems/find-a-peak-element-ii/" },
  { id: 'local-1971', num: 1971, title: "Find If Path Exists In Graph", difficulty: 'Easy', category: 'favorite', tags: ["graph", "bfs", "union-find"], url: "https://leetcode.com/problems/find-if-path-exists-in-graph/" },
  { id: 'local-2658', num: 2658, title: "Maximum Number Of Fish In A Grid", difficulty: 'Medium', category: 'favorite', tags: ["dfs", "bfs", "grid"], url: "https://leetcode.com/problems/maximum-number-of-fish-in-a-grid/" },
  ],
};

// Insert "我的题库" as the 2nd category (after FAANG)
LEETCODE_CATEGORIES.splice(1, 0, FAVORITE_CATEGORY);
