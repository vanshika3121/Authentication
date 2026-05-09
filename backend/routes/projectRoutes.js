const express = require('express');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const { checkProjectRole } = require('../middleware/rbac');

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /api/projects — List user's projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({
      'members.user': req.user._id
    })
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .sort({ createdAt: -1 });

    // Add task counts to each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const taskCount = await Task.countDocuments({ project: project._id });
        const doneCount = await Task.countDocuments({ project: project._id, status: 'done' });
        return {
          ...project.toObject(),
          taskCount,
          doneCount
        };
      })
    );

    res.json(projectsWithCounts);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/projects — Create project
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Project name is required.' });
    }

    const project = await Project.create({
      name,
      description: description || '',
      owner: req.user._id
    });

    await project.populate('owner', 'name email');
    await project.populate('members.user', 'name email');

    res.status(201).json(project);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/projects/:id — Get project details
router.get('/:id', checkProjectRole(), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/projects/:id — Update project (Admin only)
router.put('/:id', checkProjectRole('Admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const project = req.project;

    if (name) project.name = name;
    if (description !== undefined) project.description = description;

    await project.save();
    await project.populate('owner', 'name email');
    await project.populate('members.user', 'name email');

    res.json(project);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/projects/:id — Delete project (Admin only)
router.delete('/:id', checkProjectRole('Admin'), async (req, res) => {
  try {
    // Delete all tasks in the project
    await Task.deleteMany({ project: req.params.id });
    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: 'Project and all its tasks deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/projects/:id/members — Add member (Admin only)
router.post('/:id/members', checkProjectRole('Admin'), async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Member email is required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with that email.' });
    }

    const project = req.project;

    // Check if already a member
    if (project.isMember(user._id)) {
      return res.status(400).json({ message: 'User is already a member of this project.' });
    }

    project.members.push({
      user: user._id,
      role: role === 'Admin' ? 'Admin' : 'Member'
    });

    await project.save();
    await project.populate('owner', 'name email');
    await project.populate('members.user', 'name email');

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/projects/:id/members/:userId — Remove member (Admin only)
router.delete('/:id/members/:userId', checkProjectRole('Admin'), async (req, res) => {
  try {
    const project = req.project;
    const userId = req.params.userId;

    // Cannot remove the owner
    if (project.owner.toString() === userId) {
      return res.status(400).json({ message: 'Cannot remove the project owner.' });
    }

    project.members = project.members.filter(
      m => m.user.toString() !== userId
    );

    // Unassign tasks from removed member
    await Task.updateMany(
      { project: project._id, assignee: userId },
      { assignee: null }
    );

    await project.save();
    await project.populate('owner', 'name email');
    await project.populate('members.user', 'name email');

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
