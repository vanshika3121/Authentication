const Project = require('../models/Project');

/**
 * Middleware to check if user is a member of a project and optionally has a specific role.
 * Attaches req.project with the found project.
 * @param {string|null} requiredRole - 'Admin' to require admin, null to allow any member
 */
const checkProjectRole = (requiredRole = null) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.id || req.params.projectId;
      if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required.' });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found.' });
      }

      // Check if user is a member
      if (!project.isMember(req.user._id)) {
        return res.status(403).json({ message: 'You are not a member of this project.' });
      }

      // Check role if required
      if (requiredRole) {
        const userRole = project.getUserRole(req.user._id);
        if (userRole !== requiredRole) {
          return res.status(403).json({ 
            message: `This action requires ${requiredRole} role.` 
          });
        }
      }

      req.project = project;
      next();
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid project ID.' });
      }
      res.status(500).json({ message: 'Server error.' });
    }
  };
};

module.exports = { checkProjectRole };
