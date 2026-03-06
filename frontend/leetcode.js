/**
 * LeetCode & Vibe Coding Module
 * Interactive coding practice and AI code generation
 */

// Sample LeetCode Problems Database
const problems = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "easy",
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
    ],
    starterCode: `function twoSum(nums, target) {
    // Your code here
    
}`,
  },
  {
    id: 2,
    title: "Palindrome Number",
    difficulty: "easy",
    description:
      "Given an integer x, return true if x is a palindrome, and false otherwise.",
    examples: [
      {
        input: "x = 121",
        output: "true",
        explanation:
          "121 reads as 121 from left to right and from right to left.",
      },
      {
        input: "x = -121",
        output: "false",
        explanation:
          "From left to right, it reads -121. From right to left, it becomes 121-.",
      },
    ],
    constraints: ["-2^31 <= x <= 2^31 - 1"],
    starterCode: `function isPalindrome(x) {
    // Your code here
    
}`,
  },
  {
    id: 3,
    title: "Reverse String",
    difficulty: "easy",
    description:
      "Write a function that reverses a string. The input string is given as an array of characters.",
    examples: [
      {
        input: 's = ["h","e","l","l","o"]',
        output: '["o","l","l","e","h"]',
      },
    ],
    constraints: [
      "1 <= s.length <= 10^5",
      "s[i] is a printable ascii character.",
    ],
    starterCode: `function reverseString(s) {
    // Your code here - modify in place
    
}`,
  },
  {
    id: 4,
    title: "Valid Parentheses",
    difficulty: "easy",
    description:
      "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    examples: [
      {
        input: 's = "()"',
        output: "true",
      },
      {
        input: 's = "()[]{}"',
        output: "true",
      },
      {
        input: 's = "(]"',
        output: "false",
      },
    ],
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only '()[]{}'.",
    ],
    starterCode: `function isValid(s) {
    // Your code here
    
}`,
  },
  {
    id: 5,
    title: "Merge Two Sorted Lists",
    difficulty: "easy",
    description:
      "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list.",
    examples: [
      {
        input: "list1 = [1,2,4], list2 = [1,3,4]",
        output: "[1,1,2,3,4,4]",
      },
    ],
    constraints: [
      "The number of nodes in both lists is in the range [0, 50].",
      "-100 <= Node.val <= 100",
    ],
    starterCode: `function mergeTwoLists(list1, list2) {
    // Your code here
    
}`,
  },
  {
    id: 6,
    title: "Maximum Subarray",
    difficulty: "medium",
    description:
      "Given an integer array nums, find the subarray with the largest sum, and return its sum.",
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "The subarray [4,-1,2,1] has the largest sum 6.",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
    starterCode: `function maxSubArray(nums) {
    // Your code here
    
}`,
  },
  {
    id: 7,
    title: "Longest Palindromic Substring",
    difficulty: "medium",
    description:
      "Given a string s, return the longest palindromic substring in s.",
    examples: [
      {
        input: 's = "babad"',
        output: '"bab"',
        explanation: '"aba" is also a valid answer.',
      },
      {
        input: 's = "cbbd"',
        output: '"bb"',
      },
    ],
    constraints: [
      "1 <= s.length <= 1000",
      "s consist of only digits and English letters.",
    ],
    starterCode: `function longestPalindrome(s) {
    // Your code here
    
}`,
  },
  {
    id: 8,
    title: "Container With Most Water",
    difficulty: "medium",
    description:
      "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Return the maximum amount of water a container can store.",
    examples: [
      {
        input: "height = [1,8,6,2,5,4,8,3,7]",
        output: "49",
        explanation: "The max area is obtained by lines at index 1 and 8.",
      },
    ],
    constraints: [
      "n == height.length",
      "2 <= n <= 10^5",
      "0 <= height[i] <= 10^4",
    ],
    starterCode: `function maxArea(height) {
    // Your code here
    
}`,
  },
  {
    id: 9,
    title: "3Sum",
    difficulty: "medium",
    description:
      "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.",
    examples: [
      {
        input: "nums = [-1,0,1,2,-1,-4]",
        output: "[[-1,-1,2],[-1,0,1]]",
      },
    ],
    constraints: ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"],
    starterCode: `function threeSum(nums) {
    // Your code here
    
}`,
  },
  {
    id: 10,
    title: "Merge Intervals",
    difficulty: "medium",
    description:
      "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals.",
    examples: [
      {
        input: "intervals = [[1,3],[2,6],[8,10],[15,18]]",
        output: "[[1,6],[8,10],[15,18]]",
        explanation:
          "Since intervals [1,3] and [2,6] overlap, merge them into [1,6].",
      },
    ],
    constraints: [
      "1 <= intervals.length <= 10^4",
      "intervals[i].length == 2",
      "0 <= starti <= endi <= 10^4",
    ],
    starterCode: `function merge(intervals) {
    // Your code here
    
}`,
  },
  {
    id: 11,
    title: "Median of Two Sorted Arrays",
    difficulty: "hard",
    description:
      "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.",
    examples: [
      {
        input: "nums1 = [1,3], nums2 = [2]",
        output: "2.00000",
        explanation: "merged array = [1,2,3] and median is 2.",
      },
    ],
    constraints: [
      "nums1.length == m",
      "nums2.length == n",
      "0 <= m <= 1000",
      "0 <= n <= 1000",
    ],
    starterCode: `function findMedianSortedArrays(nums1, nums2) {
    // Your code here
    
}`,
  },
  {
    id: 12,
    title: "Trapping Rain Water",
    difficulty: "hard",
    description:
      "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    examples: [
      {
        input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        output: "6",
        explanation:
          "The elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1].",
      },
    ],
    constraints: [
      "n == height.length",
      "1 <= n <= 2 * 10^4",
      "0 <= height[i] <= 10^5",
    ],
    starterCode: `function trap(height) {
    // Your code here
    
}`,
  },
];

// Vibe AI Code Templates
const vibeTemplates = {
  login: {
    title: "Login Form",
    code: `import React, { useState } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!email.includes('@')) {
      newErrors.email = 'Invalid email address';
    }
    if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      console.log('Login:', { email, password });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      {errors.email && <span className="error">{errors.email}</span>}
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      {errors.password && <span className="error">{errors.password}</span>}
      
      <button type="submit">Login</button>
    </form>
  );
}

export default LoginForm;`,
  },
  api: {
    title: "REST API",
    code: `const express = require('express');
const app = express();
app.use(express.json());

// In-memory database
let users = [];

// Get all users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Create user
app.post('/api/users', (req, res) => {
  const user = {
    id: users.length + 1,
    ...req.body
  };
  users.push(user);
  res.status(201).json(user);
});

// Update user
app.put('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  Object.assign(user, req.body);
  res.json(user);
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'User not found' });
  
  users.splice(index, 1);
  res.status(204).send();
});

app.listen(3000, () => console.log('Server running on port 3000'));`,
  },
  todo: {
    title: "Todo App",
    code: `import React, { useState } from 'react';

function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (!input.trim()) return;
    setTodos([...todos, { 
      id: Date.now(), 
      text: input, 
      completed: false 
    }]);
    setInput('');
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div className="todo-app">
      <h1>My Todos</h1>
      <div className="input-group">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a new todo..."
        />
        <button onClick={addTodo}>Add</button>
      </div>
      <ul>
        {todos.map(todo => (
          <li key={todo.id} className={todo.completed ? 'completed' : ''}>
            <span onClick={() => toggleTodo(todo.id)}>{todo.text}</span>
            <button onClick={() => deleteTodo(todo.id)}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TodoApp;`,
  },
  dashboard: {
    title: "Admin Dashboard",
    code: `function AdminDashboard() {
  const stats = [
    { label: 'Total Users', value: '1,234', change: '+12%' },
    { label: 'Revenue', value: '$45,678', change: '+8%' },
    { label: 'Active Sessions', value: '567', change: '-3%' },
  ];

  const recentActivity = [
    { user: 'John D.', action: 'Created account', time: '2 min ago' },
    { user: 'Sarah M.', action: 'Purchased item', time: '15 min ago' },
    { user: 'Mike R.', action: 'Updated profile', time: '1 hour ago' },
  ];

  return (
    <div className="dashboard">
      <h1>Admin Dashboard</h1>
      
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <h3>{stat.label}</h3>
            <p className="value">{stat.value}</p>
            <span className="change positive">{stat.change}</span>
          </div>
        ))}
      </div>

      <div className="activity-section">
        <h2>Recent Activity</h2>
        <ul>
          {recentActivity.map((item, index) => (
            <li key={index}>
              <strong>{item.user}</strong> - {item.action}
              <span className="time">{item.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}`,
  },
  chat: {
    title: "Chat Application",
    code: `function ChatApp() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello!', sender: 'bot', time: '10:00' }
  ]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    
    const newMessage = {
      id: messages.length + 1,
      text: input,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([...messages, newMessage]);
    setInput('');
    
    // Simulate bot response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: getBotResponse(input),
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1000);
  };

  const getBotResponse = (input) => {
    const responses = {
      'hi': 'Hello! How can I help you?',
      'help': 'I can help you with coding questions!',
      'default': 'That\'s interesting! Tell me more.'
    };
    const key = Object.keys(responses).find(k => input.toLowerCase().includes(k));
    return responses[key] || responses.default;
  };

  return (
    <div className="chat-app">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={\`message \${msg.sender}\`}>
            <p>{msg.text}</p>
            <span className="time">{msg.time}</span>
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}`,
  },
};

// DOM Elements
const tabProblems = document.getElementById("tab-problems");
const tabPractice = document.getElementById("tab-practice");
const tabVibe = document.getElementById("tab-vibe");
const problemsView = document.getElementById("problems-view");
const practiceView = document.getElementById("practice-view");
const vibeView = document.getElementById("vibe-view");
const problemsGrid = document.getElementById("problems-grid");
const filterBtns = document.querySelectorAll(".filter-btn");

// Practice elements
const practiceTitle = document.getElementById("practice-title");
const practiceDifficulty = document.getElementById("practice-difficulty");
const practiceDescription = document.getElementById("practice-description");
const codeEditor = document.getElementById("code-editor");
const languageSelect = document.getElementById("language-select");
const runBtn = document.getElementById("run-btn");
const submitBtn = document.getElementById("submit-btn");
const outputPanel = document.getElementById("output-panel");
const outputStatus = document.getElementById("output-status");
const outputContent = document.getElementById("output-content");

// Vibe elements
const vibeInput = document.getElementById("vibe-input");
const vibeStack = document.getElementById("vibe-stack");
const vibeGenerateBtn = document.getElementById("vibe-generate-btn");
const vibeOutput = document.getElementById("vibe-output");
const vibeLoading = document.getElementById("vibe-loading");
const copyVibeCodeBtn = document.getElementById("copy-vibe-code");

// Initialize problems list
function renderProblems(filter = "all") {
  const filtered =
    filter === "all"
      ? problems
      : problems.filter((p) => p.difficulty === filter);

  problemsGrid.innerHTML = filtered
    .map(
      (problem) => `
        <div class="problem-card glass-panel p-4 rounded-xl cursor-pointer border border-gray-800" onclick="openProblem(${problem.id})">
            <div class="flex items-center justify-between mb-2">
                <span class="text-white font-medium">${problem.title}</span>
                <span class="px-2 py-1 rounded-full text-xs font-medium ${problem.difficulty === "easy" ? "bg-green-500/20 text-green-500" : problem.difficulty === "medium" ? "bg-yellow-500/20 text-yellow-500" : "bg-red-500/20 text-red-500"}">
                    ${problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                </span>
            </div>
            <p class="text-gray-500 text-sm line-clamp-2">${problem.description}</p>
        </div>
    `,
    )
    .join("");
}

// Open problem in practice arena
window.openProblem = function (id) {
  const problem = problems.find((p) => p.id === id);
  if (!problem) return;

  practiceTitle.textContent = problem.title;
  practiceDifficulty.textContent =
    problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1);
  practiceDifficulty.className = `px-3 py-1 rounded-full text-xs font-medium ${problem.difficulty === "easy" ? "bg-green-500/20 text-green-500" : problem.difficulty === "medium" ? "bg-yellow-500/20 text-yellow-500" : "bg-red-500/20 text-red-500"}`;

  let desc = problem.description;
  if (problem.examples && problem.examples.length > 0) {
    desc += "\n\n";
    problem.examples.forEach((ex, i) => {
      desc += `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}`;
      if (ex.explanation) desc += `\nExplanation: ${ex.explanation}`;
      desc += "\n\n";
    });
  }
  if (problem.constraints) {
    desc +=
      "Constraints:\n" + problem.constraints.map((c) => "• " + c).join("\n");
  }
  practiceDescription.textContent = desc;
  codeEditor.value = problem.starterCode;
  outputPanel.classList.add("hidden");

  switchTab("practice");
};

// Tab switching
function switchTab(tab) {
  tabProblems.classList.remove("active");
  tabPractice.classList.remove("active");
  tabVibe.classList.remove("active");
  problemsView.classList.add("hidden");
  practiceView.classList.add("hidden");
  vibeView.classList.add("hidden");

  if (tab === "problems") {
    tabProblems.classList.add("active");
    problemsView.classList.remove("hidden");
  } else if (tab === "practice") {
    tabPractice.classList.add("active");
    practiceView.classList.remove("hidden");
  } else if (tab === "vibe") {
    tabVibe.classList.add("active");
    vibeView.classList.remove("hidden");
  }
}

tabProblems.addEventListener("click", () => switchTab("problems"));
tabPractice.addEventListener("click", () => switchTab("practice"));
tabVibe.addEventListener("click", () => switchTab("vibe"));

// Filter buttons
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) =>
      b.classList.remove(
        "active",
        "bg-accent/20",
        "text-accent",
        "border-accent/50",
      ),
    );
    btn.classList.add(
      "active",
      "bg-accent/20",
      "text-accent",
      "border-accent/50",
    );
    renderProblems(btn.dataset.filter);
  });
});

// Run code
runBtn.addEventListener("click", () => {
  outputPanel.classList.remove("hidden");
  outputStatus.textContent = "Running...";
  outputStatus.className =
    "text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-500";

  // Simple execution simulation
  setTimeout(() => {
    outputStatus.textContent = "Executed";
    outputStatus.className =
      "text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-500";
    outputContent.textContent =
      "Code executed successfully!\n\nOutput: See console for results";
  }, 1000);
});

// Submit code
submitBtn.addEventListener("click", () => {
  outputPanel.classList.remove("hidden");
  outputStatus.textContent = "Testing...";
  outputStatus.className =
    "text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-500";

  setTimeout(() => {
    // Random success/fail for demo
    const success = Math.random() > 0.5;
    if (success) {
      outputStatus.textContent = "Accepted ✓";
      outputStatus.className =
        "text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-500";
      outputContent.textContent =
        "Test Cases Passed!\n\nAll test cases passed successfully.";
    } else {
      outputStatus.textContent = "Wrong Answer ✗";
      outputStatus.className =
        "text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-500";
      outputContent.textContent =
        "Expected: [0, 1]\nYour output: undefined\n\nCheck your implementation and try again.";
    }
  }, 1500);
});

// Vibe AI Generate
vibeGenerateBtn.addEventListener("click", () => {
  const input = vibeInput.value.trim();
  if (!input) {
    alert("Please describe what you want to build!");
    return;
  }

  vibeLoading.classList.remove("hidden");
  vibeOutput.innerHTML = "";

  // Simulate AI generation
  setTimeout(() => {
    vibeLoading.classList.add("hidden");

    // Find matching template or generate generic response
    const lowerInput = input.toLowerCase();
    let generatedCode = "";

    if (lowerInput.includes("login") || lowerInput.includes("sign in")) {
      generatedCode = vibeTemplates.login.code;
    } else if (
      lowerInput.includes("api") ||
      lowerInput.includes("rest") ||
      lowerInput.includes("server")
    ) {
      generatedCode = vibeTemplates.api.code;
    } else if (
      lowerInput.includes("todo") ||
      lowerInput.includes("task") ||
      lowerInput.includes("list")
    ) {
      generatedCode = vibeTemplates.todo.code;
    } else if (
      lowerInput.includes("dashboard") ||
      lowerInput.includes("admin")
    ) {
      generatedCode = vibeTemplates.dashboard.code;
    } else if (lowerInput.includes("chat") || lowerInput.includes("message")) {
      generatedCode = vibeTemplates.chat.code;
    } else {
      // Generic generated code
      generatedCode = `// ${input}\n// Generated based on your description\n\n/*\n * This is a placeholder for the code that would be generated\n * based on your requirements: "${input}"\n * \n * Tech Stack: ${vibeStack.value || "Not specified"}\n */\n\nfunction solution() {\n    // Your implementation here\n    console.log("Hello from Vibe AI!");\n}`;
    }

    vibeOutput.innerHTML = `<code>${generatedCode}</code>`;
  }, 2000);
});

// Copy vibe code
copyVibeCodeBtn.addEventListener("click", () => {
  const code = vibeOutput.textContent;
  navigator.clipboard.writeText(code).then(() => {
    const originalText = copyVibeCodeBtn.textContent;
    copyVibeCodeBtn.textContent = "Copied!";
    setTimeout(() => {
      copyVibeCodeBtn.textContent = originalText;
    }, 2000);
  });
});

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  renderProblems();
});
