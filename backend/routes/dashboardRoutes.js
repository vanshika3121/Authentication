const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// POST /api/dashboard/seed — Create demo data
router.post('/seed', async (req, res) => {
  try {
    const Project = require('../models/Project');
    const project = await Project.create({
      name: '🚀 Marketing Launch Q2',
      description: 'Full rollout for the new product features.',
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'Admin' }]
    });

    const Task = require('../models/Task');
    await Task.create([
      { title: 'Finalize UI Mockups', status: 'done', priority: 'high', project: project._id, createdBy: req.user._id, assignee: req.user._id },
      { title: 'Social Media Strategy', status: 'in-progress', priority: 'medium', project: project._id, createdBy: req.user._id, assignee: req.user._id, dueDate: new Date(Date.now() + 86400000 * 2) },
      { title: 'Press Release Draft', status: 'todo', priority: 'low', project: project._id, createdBy: req.user._id }
    ]);

    res.json({ message: 'Demo data seeded successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Seeding failed.' });
  }
});

// GET /api/dashboard — Aggregated stats for the current user
router.get('/', async (req, res) => {
  try {
    // Get all projects the user is a member of
    const projects = await Project.find({
      'members.user': req.user._id
    }).select('_id name');

    const projectIds = projects.map(p => p._id);

    // Get all tasks across user's projects
    const allTasks = await Task.find({ project: { $in: projectIds } })
      .populate('assignee', 'name email')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    // Tasks assigned to current user
    const myTasks = allTasks.filter(
      t => t.assignee && t.assignee._id.toString() === req.user._id.toString()
    );

    // Status counts
    const statusCounts = {
      todo: allTasks.filter(t => t.status === 'todo').length,
      'in-progress': allTasks.filter(t => t.status === 'in-progress').length,
      done: allTasks.filter(t => t.status === 'done').length
    };

    // Overdue tasks (due date is before now and not done)
    const now = new Date();
    const overdueTasks = allTasks.filter(
      t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
    );

    // Priority counts
    const priorityCounts = {
      high: allTasks.filter(t => t.priority === 'high').length,
      medium: allTasks.filter(t => t.priority === 'medium').length,
      low: allTasks.filter(t => t.priority === 'low').length
    };

    // Recent tasks (last 10)
    const recentTasks = allTasks.slice(0, 10);

    res.json({
      totalProjects: projects.length,
      totalTasks: allTasks.length,
      statusCounts,
      priorityCounts,
      overdueTasks: overdueTasks.length,
      overdueTasksList: overdueTasks.slice(0, 5),
      myTasks: myTasks.length,
      myTasksList: myTasks.slice(0, 5),
      recentTasks,
      projects
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
