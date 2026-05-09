const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['Admin', 'Member'],
    default: 'Member'
  }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    minlength: [2, 'Project name must be at least 2 characters'],
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [memberSchema]
}, {
  timestamps: true
});

// Ensure owner is always an Admin member
projectSchema.pre('save', function () {
  if (this.isNew) {
    const ownerIsMember = this.members.some(
      m => m.user.toString() === this.owner.toString()
    );
    if (!ownerIsMember) {
      this.members.push({ user: this.owner, role: 'Admin' });
    }
  }
});

// Helper: get a user's role in this project
projectSchema.methods.getUserRole = function (userId) {
  const member = this.members.find(
    m => m.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

// Helper: check if user is a member
projectSchema.methods.isMember = function (userId) {
  return this.members.some(
    m => m.user.toString() === userId.toString()
  );
};

module.exports = mongoose.model('Project', projectSchema);
