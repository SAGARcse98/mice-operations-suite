const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { _id: true }
);

const expenseItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
    },
    category: {
      type: String,
      enum: ['Meeting', 'Incentive', 'Conference', 'Exhibition'],
      default: 'Conference',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    venue: { type: String, trim: true, default: '' },
    budget: { type: Number, default: 0, min: 0 },
    eventDate: { type: String, default: '' },
    clientName: { type: String, trim: true, default: '' },
    contactPerson: { type: String, trim: true, default: '' },
    expectedAttendees: { type: Number, default: 100, min: 0 },
    registeredAttendees: { type: Number, default: 0, min: 0 },
    checklist: { type: [checklistItemSchema], default: [] },
    expenses: { type: [expenseItemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);

module.exports = mongoose.model('Task', taskSchema);