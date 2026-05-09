const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const auth = require('../middleware/auth');
const { checkProjectRole } = require('../middleware/rbac');

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /api/projects/:id/tasks — List tasks in project
router.get('/projects/:id/tasks', checkProjectRole(), async (req, res) => {
  try {
    const { status, assignee, priority, sort } = req.query;
    const filter = { project: req.params.id };

    if (status) filter.status = status;
    if (assignee) filter.assignee = assignee;
    if (priority) filter.priority = priority;

    let sortObj = { createdAt: -1 };
    if (sort === 'dueDate') sortObj = { dueDate: 1 };
    if (sort === 'priority') sortObj = { priority: -1 };

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort(sortObj);

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/projects/:id/tasks — Create task
router.post('/projects/:id/tasks', checkProjectRole(), async (req, res) => {
  try {
    const { title, description, assignee, status, priority, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Task title is required.' });
    }

    // If assignee is specified, verify they are a project member
    if (assignee) {
      const project = req.project;
      if (!project.isMember(assignee)) {
        return res.status(400).json({ message: 'Assignee must be a project member.' });
      }
    }

    const task = await Task.create({
      title,
      description: description || '',
      project: req.params.id,
      assignee: assignee || null,
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      createdBy: req.user._id
    });

    await task.populate('assignee', 'name email');
    await task.populate('createdBy', 'name email');

    res.status(201).json(task);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/tasks/:id — Update task
router.put('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Check project membership
    const project = await Project.findById(task.project);
    if (!project || !project.isMember(req.user._id)) {
      return res.status(403).json({ message: 'You are not a member of this project.' });
    }

    const userRole = project.getUserRole(req.user._id);
    const isAdmin = userRole === 'Admin';
    const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();
    const isCreator = task.createdBy.toString() === req.user._id.toString();

    // Members can only update their own/assigned tasks
    if (!isAdmin && !isAssignee && !isCreator) {
      return res.status(403).json({ message: 'You can only edit tasks assigned to you or created by you.' });
    }

    const { title, description, assignee, status, priority, dueDate } = req.body;

    // If assignee is being changed, verify they are a project member
    if (assignee !== undefined && assignee !== null) {
      if (!project.isMember(assignee)) {
        return res.status(400).json({ message: 'Assignee must be a project member.' });
      }
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignee !== undefined) task.assignee = assignee || null;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate || null;

    await task.save();
    await task.populate('assignee', 'name email');
    await task.populate('createdBy', 'name email');

    res.json(task);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid task ID.' });
    }
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/tasks/:id — Delete task (Admin only)
router.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const project = await Project.findById(task.project);
    if (!project || !project.isMember(req.user._id)) {
      return res.status(403).json({ message: 'You are not a member of this project.' });
    }

    const userRole = project.getUserRole(req.user._id);
    if (userRole !== 'Admin') {
      return res.status(403).json({ message: 'Only admins can delete tasks.' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted.' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid task ID.' });
    }
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
