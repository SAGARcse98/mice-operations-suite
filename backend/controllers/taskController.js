const Task = require('../models/Task');

const sampleMiceEvents = [
  {
    title: 'Global FinTech Leadership Summit 2026',
    description:
      'Keynote plenaries, C-suite networking lounge, and 40+ sponsor exhibition booths.',
    category: 'Conference',
    status: 'In Progress',
    priority: 'High',
    venue: 'Grand Ballroom & Hall A, Marina Bay Sands',
    budget: 145000,
    eventDate: '2026-11-18',
    clientName: 'FinSphere Global',
    contactPerson: 'Elena Rostova',
    expectedAttendees: 850,
    registeredAttendees: 720,
    checklist: [
      { text: 'Confirm main stage LED wall & AV vendor', completed: true },
      { text: 'Finalize VIP keynote speaker travel itineraries', completed: true },
      { text: 'Approve gala dinner catering menu', completed: false },
      { text: 'Print RFID attendee badges', completed: false },
    ],
    expenses: [
      { title: 'Venue Ballroom Deposit', amount: 55000 },
      { title: 'AV, Lighting & Stage Rigging', amount: 32000 },
      { title: 'Keynote Speaker Honorariums', amount: 24000 },
    ],
  },
  {
    title: 'President’s Club Alpine Incentive Retreat',
    description:
      'All-inclusive 4-day executive reward trip for top 60 global account directors.',
    category: 'Incentive',
    status: 'Pending',
    priority: 'High',
    venue: 'Badrutt’s Palace Resort, St. Moritz',
    budget: 92000,
    eventDate: '2026-12-05',
    clientName: 'CloudScale Enterprise',
    contactPerson: 'Marcus Vance',
    expectedAttendees: 60,
    registeredAttendees: 58,
    checklist: [
      { text: 'Book private charter transfers from Zurich', completed: true },
      { text: 'Order custom crystal awards & welcome gifts', completed: false },
      { text: 'Confirm private mountain chalet dinner reservation', completed: false },
    ],
    expenses: [
      { title: 'Luxury Resort Suite Block', amount: 48000 },
      { title: 'Private Helicopter & Charter Transfers', amount: 18500 },
    ],
  },
  {
    title: 'NextGen MedTech & Robotics Expo',
    description:
      'International trade exhibition showcasing surgical robotics and diagnostic AI.',
    category: 'Exhibition',
    status: 'In Progress',
    priority: 'Medium',
    venue: 'ExCeL Convention Centre, Hall S4',
    budget: 210000,
    eventDate: '2026-11-02',
    clientName: 'BioHealth Alliance',
    contactPerson: 'Dr. Aris Thorne',
    expectedAttendees: 1500,
    registeredAttendees: 1340,
    checklist: [
      { text: 'Approve floorplan & custom island booth schematics', completed: true },
      { text: 'Schedule heavy equipment freight & rigging crew', completed: true },
      { text: 'Coordinate lead-scanner app licenses for exhibitors', completed: true },
      { text: 'On-site fire & electrical safety inspection', completed: false },
    ],
    expenses: [
      { title: 'Exhibition Hall S4 Lease', amount: 95000 },
      { title: 'Modular Booth Construction & Power Grid', amount: 68000 },
      { title: 'Security & Paramedic Standby Crew', amount: 14500 },
    ],
  },
  {
    title: 'Q4 APAC Regional Board Strategy Meeting',
    description:
      'Closed-door board governance meeting with hybrid encrypted telepresence.',
    category: 'Meeting',
    status: 'Completed',
    priority: 'Medium',
    venue: 'The Ritz-Carlton Executive Boardroom',
    budget: 18500,
    eventDate: '2026-10-14',
    clientName: 'Nexus Ventures',
    contactPerson: 'Priya Nair',
    expectedAttendees: 35,
    registeredAttendees: 35,
    checklist: [
      { text: 'Test simultaneous interpretation & Zoom Rooms bridge', completed: true },
      { text: 'Distribute bound board decks under NDA', completed: true },
      { text: 'Executive working lunch & dietary accommodations', completed: true },
    ],
    expenses: [
      { title: 'Executive Boardroom & Telepresence Suite', amount: 9200 },
      { title: 'Fine Dining Executive Catering', amount: 6400 },
    ],
  },
  {
    title: 'CleanEnergy & EV Mobility Trade Show',
    description:
      'Multi-pavilion exhibition with live EV test-track demonstrations and press zone.',
    category: 'Exhibition',
    status: 'Pending',
    priority: 'High',
    venue: 'Messe Frankfurt Pavilion 3',
    budget: 175000,
    eventDate: '2026-11-28',
    clientName: 'VoltGrid Motors',
    contactPerson: 'Lukas Weber',
    expectedAttendees: 1200,
    registeredAttendees: 640,
    checklist: [
      { text: 'High-voltage charging station permit approval', completed: true },
      { text: 'Media & press kit distribution setup', completed: false },
      { text: 'Confirm security & crowd management staffing', completed: false },
    ],
    expenses: [
      { title: 'Pavilion 3 & Outdoor Track Reservation', amount: 82000 },
      { title: 'High-Voltage EV Charging Infrastructure', amount: 39000 },
    ],
  },
  {
    title: 'Global Partner Enablement Kickoff',
    description:
      'Two-day channel partner training conference and awards ceremony.',
    category: 'Conference',
    status: 'Completed',
    priority: 'Low',
    venue: 'JW Marriott Marquis Ballroom',
    budget: 64000,
    eventDate: '2026-10-08',
    clientName: 'DataPulse Inc.',
    contactPerson: 'Hannah Kim',
    expectedAttendees: 400,
    registeredAttendees: 392,
    checklist: [
      { text: 'Breakout room signage & wayfinding banners', completed: true },
      { text: 'Post-event NPS survey & slide deck distribution', completed: true },
    ],
    expenses: [
      { title: 'Ballroom & 6 Breakout Rooms', amount: 38000 },
      { title: 'Awards Gala & Partner Swag Kits', amount: 21500 },
    ],
  },
];

// GET /api/tasks — Read all with search, filters, sorting, pagination & KPI stats
exports.getTasks = async (req, res, next) => {
  try {
    const {
      search = '',
      status = '',
      category = '',
      priority = '',
      sortBy = 'newest',
      page = 1,
      limit = 6,
    } = req.query;

    const query = {};

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { title: regex },
        { venue: regex },
        { clientName: regex },
        { contactPerson: regex },
      ];
    }

    if (status && status !== 'All') query.status = status;
    if (category && category !== 'All') query.category = category;
    if (priority && priority !== 'All') query.priority = priority;

    let sortOption = { createdAt: -1 };
    if (sortBy === 'dateAsc') sortOption = { eventDate: 1, createdAt: -1 };
    else if (sortBy === 'budgetDesc') sortOption = { budget: -1 };
    else if (sortBy === 'budgetAsc') sortOption = { budget: 1 };
    else if (sortBy === 'titleAsc') sortOption = { title: 1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 6);
    const skip = (pageNum - 1) * limitNum;

    const [tasks, total, allTasks] = await Promise.all([
      Task.find(query).sort(sortOption).skip(skip).limit(limitNum),
      Task.countDocuments(query),
      Task.find({}, 'status category budget expenses registeredAttendees expectedAttendees'),
    ]);

    const categoryBreakdown = {
      Meeting: { count: 0, budget: 0 },
      Incentive: { count: 0, budget: 0 },
      Conference: { count: 0, budget: 0 },
      Exhibition: { count: 0, budget: 0 },
    };

    const stats = allTasks.reduce(
      (acc, item) => {
        const itemBudget = Number(item.budget) || 0;
        const itemSpent = (item.expenses || []).reduce(
          (sum, exp) => sum + (Number(exp.amount) || 0),
          0
        );
        const cat =
          item.category && categoryBreakdown[item.category] ? item.category : 'Meeting';

        acc.totalEvents += 1;
        acc.totalBudget += itemBudget;
        acc.totalSpent += itemSpent;
        acc.totalRegistered += Number(item.registeredAttendees) || 0;
        acc.totalCapacity += Number(item.expectedAttendees) || 0;

        if (item.status === 'Completed') acc.completed += 1;
        else if (item.status === 'In Progress') acc.inProgress += 1;
        else acc.pending += 1;

        categoryBreakdown[cat].count += 1;
        categoryBreakdown[cat].budget += itemBudget;

        return acc;
      },
      {
        totalEvents: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        totalBudget: 0,
        totalSpent: 0,
        totalRegistered: 0,
        totalCapacity: 0,
        categoryBreakdown,
      }
    );

    res.status(200).json({
      tasks,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      stats,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/tasks — Create a new MICE event
exports.createTask = async (req, res) => {
  try {
    const task = await Task.create(req.body);
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// POST /api/tasks/seed — Seed realistic MICE demo events
exports.seedDemoTasks = async (req, res, next) => {
  try {
    const created = await Task.insertMany(sampleMiceEvents);
    res.status(201).json({
      message: `Seeded ${created.length} sample MICE events`,
      tasks: created,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/tasks/bulk — Batch status update or batch delete
exports.bulkAction = async (req, res, next) => {
  try {
    const { ids = [], action, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No event IDs provided' });
    }

    if (action === 'delete') {
      await Task.deleteMany({ _id: { $in: ids } });
      return res.status(200).json({ message: `Deleted ${ids.length} events`, ids });
    }

    if (action === 'status' && status) {
      await Task.updateMany({ _id: { $in: ids } }, { $set: { status } });
      return res
        .status(200)
        .json({ message: `Updated ${ids.length} events to ${status}`, ids, status });
    }

    res.status(400).json({ message: 'Invalid bulk action' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/tasks/:id — Update an existing MICE event
exports.updateTask = async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedTask) return res.status(404).json({ message: 'Event not found' });
    res.status(200).json(updatedTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/tasks/:id — Delete a MICE event
exports.deleteTask = async (req, res, next) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) return res.status(404).json({ message: 'Event not found' });
    res.status(200).json({ id: req.params.id, message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
};
