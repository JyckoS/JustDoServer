app.get("/", (req, res) => {
  res.json({ status: "ok" });
});
console.log("Server starting...");

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const uuidv4 = require("uuid").v4;

app.use(cors());
app.use(express.json());
const JWT_SECRET = "jycko-handsome"; // In production, use an environment variable for this

let users = [];
let todo = new Map();

// MIDDLEWARE - protect routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid or expired token" });
    req.user = user; // contains email and id
    next();
  });
};

// TOGGLE COMPLETED
app.put("/todo/complete", authenticateToken, (req, res) => {
  const userEmail = req.user.email; // from token, not body
  const { todoId } = req.body;

  const userTodos = todo.get(userEmail) || [];
  const todoItem = userTodos.find(t => t.id === todoId);
  if (!todoItem) return res.status(404).json({ message: "Todo not found" });

  todoItem.completed = !todoItem.completed;
  todo.set(userEmail, userTodos);
  res.status(201).json({ message: "Todo updated successfully", todo: todoItem });
});

// REMOVE TODO
app.delete("/todo/remove", authenticateToken, (req, res) => {
  const userEmail = req.user.email;
  const { todoId } = req.body;

  const userTodos = todo.get(userEmail) || [];
  const updatedTodos = userTodos.filter(t => t.id !== todoId);
  if (updatedTodos.length === userTodos.length) {
    return res.status(404).json({ message: "Todo not found" });
  }

  todo.set(userEmail, updatedTodos);
  res.status(201).json({ message: "Todo removed successfully" });
});

// ADD TODO
app.post("/todo/add", authenticateToken, (req, res) => {
  const userEmail = req.user.email;
  const { title } = req.body;
  if (!title) return res.status(400).json({ message: "Title is required" });

  const userTodos = todo.get(userEmail) || [];
  const newTodo = { id: uuidv4(), completed: false, title };
  userTodos.push(newTodo);
  todo.set(userEmail, userTodos);

  res.status(201).json({ message: "Test change Todo added successfully", todo: newTodo });
});

// GET ALL TODOS
app.get("/todo/list", authenticateToken, (req, res) => {
  const userEmail = req.user.email;
  const userTodos = todo.get(userEmail) || [];
  res.status(201).json({ message: "Todos retrieved successfully", todos: userTodos });
});

// REGISTER
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }
  const newUser = { id: uuidv4(), email, password };
  users.push(newUser);
  res.status(201).json({ message: "User registered successfully" });
});

// LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({ message: "Login successful", token });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
