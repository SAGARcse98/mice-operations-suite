import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTasks,
  createTask,
  seedTasks,
  bulkTasksAction,
  updateTask,
  deleteTask,
  clearActivityLog,
} from './features/tasks/taskSlice';
import { useDebounce } from './hooks/useDebounce';
import './App.css';

const initialForm = {
  title: '',
  description: '',
  category: 'Conference',
  status: 'Pending',
  priority: 'Medium',
  venue: '',
  budget: '',
  eventDate: '',
  clientName: '',
  contactPerson: '',
  expectedAttendees: 100,
  registeredAttendees: 0,
  checklist: [],
  expenses: [],
};

const categoryColors = {
  Meeting: '#6366f1',
  Incentive: '#ec4899',
  Conference: '#3b82f6',
  Exhibition: '#a855f7',
};

export default function App() {
  const dispatch = useDispatch();
  const { items: tasks, loading, error, page, totalPages, total, stats, activityLog } =
    useSelector((state) => state.tasks);

  const searchInputRef = useRef(null);

  const [formData, setFormData] = useState(initialForm);
  const [checklistInput, setChecklistInput] = useState('');
  const [editId, setEditId] = useState(null);

  // Filters, Debounced Search, Sort, View Mode & Pagination
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'kanban' | 'timeline'
  const [currentPage, setCurrentPage] = useState(1);

  // Multi-select Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Inspector Modal (Budget vs. Actual Expense Tracker)
  const [inspectTaskId, setInspectTaskId] = useState(null);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Activity Log Drawer, Dark Mode, Toast & Delete Confirmation Modal
  const [showActivity, setShowActivity] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mice_theme') === 'dark');
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const inspectedTask = tasks.find((t) => t._id === inspectTaskId) || null;
  const limit = viewMode === 'grid' ? 6 : 50;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    localStorage.setItem('mice_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Global Keyboard Shortcuts: '/' to focus search, 'Escape' to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDeleteTarget(null);
        setInspectTaskId(null);
      }
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadTasks = () => {
    dispatch(
      fetchTasks({
        search: debouncedSearch,
        category: categoryFilter,
        status: statusFilter,
        priority: priorityFilter,
        sortBy,
        page: currentPage,
        limit,
      })
    );
  };

  useEffect(() => {
    loadTasks();
  }, [
    dispatch,
    debouncedSearch,
    categoryFilter,
    statusFilter,
    priorityFilter,
    sortBy,
    currentPage,
    viewMode,
  ]);

  const hasActiveFilters =
    search.trim() !== '' ||
    categoryFilter !== 'All' ||
    statusFilter !== 'All' ||
    priorityFilter !== 'All' ||
    sortBy !== 'newest';

  const handleResetFilters = () => {
    setSearch('');
    setCategoryFilter('All');
    setStatusFilter('All');
    setPriorityFilter('All');
    setSortBy('newest');
    setCurrentPage(1);
    showToast('Filters reset');
  };

  const handleSeedDemo = async () => {
    await dispatch(seedTasks());
    showToast('Seeded 6 sample MICE events!');
    loadTasks();
  };

  // Multi-Select Toggle & Bulk Operations
  const toggleSelectId = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatus = async (status) => {
    if (!selectedIds.length) return;
    await dispatch(bulkTasksAction({ ids: selectedIds, action: 'status', status }));
    showToast(`Marked ${selectedIds.length} events as ${status}`);
    setSelectedIds([]);
    loadTasks();
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    await dispatch(bulkTasksAction({ ids: selectedIds, action: 'delete' }));
    showToast(`Deleted ${selectedIds.length} selected events`);
    setSelectedIds([]);
    loadTasks();
  };

  // Live Attendee Check-In Counter (+1 / -1 / +10)
  const handleQuickAttendeeChange = async (task, delta) => {
    const nextCount = Math.max(0, (Number(task.registeredAttendees) || 0) + delta);
    await dispatch(
      updateTask({
        id: task._id,
        taskData: { ...task, registeredAttendees: nextCount },
      })
    );
    loadTasks();
  };

  // Expense Tracker Actions inside Inspector Modal
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!inspectedTask || !expenseTitle.trim() || !expenseAmount) return;
    const newExpenses = [
      ...(inspectedTask.expenses || []),
      { title: expenseTitle.trim(), amount: Number(expenseAmount) || 0 },
    ];
    await dispatch(
      updateTask({
        id: inspectedTask._id,
        taskData: { ...inspectedTask, expenses: newExpenses },
      })
    );
    setExpenseTitle('');
    setExpenseAmount('');
    showToast('Expense logged');
    loadTasks();
  };

  const handleRemoveExpense = async (idx) => {
    if (!inspectedTask) return;
    const newExpenses = (inspectedTask.expenses || []).filter((_, i) => i !== idx);
    await dispatch(
      updateTask({
        id: inspectedTask._id,
        taskData: { ...inspectedTask, expenses: newExpenses },
      })
    );
    loadTasks();
  };

  // 1-Click Printable Event Operations Run-Sheet
  const handlePrintRunSheet = (task) => {
    const spent = (task.expenses || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const checklistHtml = (task.checklist || [])
      .map(
        (c) =>
          `<li style="margin-bottom:6px;">[${c.completed ? '✔' : ' '}] ${c.text}</li>`
      )
      .join('');
    const expensesHtml = (task.expenses || [])
      .map((x) => `<tr><td>${x.title}</td><td style="text-align:right;">$${x.amount}</td></tr>`)
      .join('');

    const printWin = window.open('', '_blank', 'width=800,height=700');
    if (!printWin) return;
    printWin.document.write(`
      <html>
        <head>
          <title>MICE Operations Run-Sheet — ${task.title}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 32px; color: #0f172a; }
            h1 { margin: 0 0 6px; }
            .meta { margin: 16px 0; padding: 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            td, th { border-bottom: 1px solid #e2e8f0; padding: 8px 4px; text-align: left; }
          </style>
        </head>
        <body>
          <h1>${task.title}</h1>
          <p><strong>Category:</strong> ${task.category} | <strong>Status:</strong> ${task.status} | <strong>Priority:</strong> ${task.priority}</p>
          <div class="meta">
            <p><strong>Venue:</strong> ${task.venue || 'TBD'} &nbsp;|&nbsp; <strong>Event Date:</strong> ${task.eventDate || 'TBD'}</p>
            <p><strong>Client / Sponsor:</strong> ${task.clientName || 'N/A'} &nbsp;|&nbsp; <strong>Lead Coordinator:</strong> ${task.contactPerson || 'N/A'}</p>
            <p><strong>Attendance:</strong> ${task.registeredAttendees || 0} registered / ${task.expectedAttendees || 100} capacity</p>
            <p><strong>Budget:</strong> $${task.budget || 0} &nbsp;|&nbsp; <strong>Actual Spend:</strong> $${spent}</p>
          </div>
          <h3>Operations & Logistics Notes</h3>
          <p>${task.description || 'No additional notes.'}</p>
          <h3>On-Site Checklist</h3>
          <ul style="list-style:none;padding-left:0;">${checklistHtml || '<li>No checklist items</li>'}</ul>
          <h3>Expense Breakdown</h3>
          <table>
            <thead><tr><th>Expense Item</th><th style="text-align:right;">Amount (USD)</th></tr></thead>
            <tbody>${expensesHtml || '<tr><td colspan="2">No expenses logged</td></tr>'}</tbody>
          </table>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleAddChecklistItem = () => {
    if (!checklistInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      checklist: [...(prev.checklist || []), { text: checklistInput.trim(), completed: false }],
    }));
    setChecklistInput('');
  };

  const handleRemoveChecklistItem = (idx) => {
    setFormData((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const payload = {
      ...formData,
      budget: Number(formData.budget) || 0,
      expectedAttendees: Number(formData.expectedAttendees) || 100,
      registeredAttendees: Number(formData.registeredAttendees) || 0,
    };

    if (editId) {
      await dispatch(updateTask({ id: editId, taskData: payload }));
      setEditId(null);
      showToast('MICE event updated successfully');
    } else {
      await dispatch(createTask(payload));
      showToast('New MICE event scheduled');
    }

    setFormData(initialForm);
    setChecklistInput('');
    loadTasks();
  };

  const handleEdit = (task) => {
    setEditId(task._id);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      category: task.category || 'Conference',
      status: task.status || 'Pending',
      priority: task.priority || 'Medium',
      venue: task.venue || '',
      budget: task.budget ?? '',
      eventDate: task.eventDate || '',
      clientName: task.clientName || '',
      contactPerson: task.contactPerson || '',
      expectedAttendees: task.expectedAttendees ?? 100,
      registeredAttendees: task.registeredAttendees ?? 0,
      checklist: task.checklist ? task.checklist.map((c) => ({ ...c })) : [],
      expenses: task.expenses ? task.expenses.map((x) => ({ ...x })) : [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicate = async (task) => {
    const clonedPayload = {
      title: `${task.title} (Copy)`,
      description: task.description || '',
      category: task.category || 'Conference',
      status: 'Pending',
      priority: task.priority || 'Medium',
      venue: task.venue || '',
      budget: Number(task.budget) || 0,
      eventDate: task.eventDate || '',
      clientName: task.clientName || '',
      contactPerson: task.contactPerson || '',
      expectedAttendees: Number(task.expectedAttendees) || 100,
      registeredAttendees: 0,
      checklist: (task.checklist || []).map((c) => ({ text: c.text, completed: false })),
      expenses: (task.expenses || []).map((x) => ({ title: x.title, amount: x.amount })),
    };
    await dispatch(createTask(clonedPayload));
    showToast(`Duplicated "${task.title}"`);
    loadTasks();
  };

  const handleQuickStatusChange = async (task, newStatus) => {
    await dispatch(updateTask({ id: task._id, taskData: { ...task, status: newStatus } }));
    showToast(`Status updated to "${newStatus}"`);
    loadTasks();
  };

  const handleToggleChecklistOnCard = async (task, idx) => {
    const updatedChecklist = (task.checklist || []).map((item, i) =>
      i === idx ? { ...item, completed: !item.completed } : item
    );
    await dispatch(
      updateTask({ id: task._id, taskData: { ...task, checklist: updatedChecklist } })
    );
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteTask(deleteTarget._id));
    setDeleteTarget(null);
    showToast('Event deleted');
    loadTasks();
  };

  const handleExportCSV = () => {
    if (!tasks.length) {
      showToast('No events to export');
      return;
    }
    const headers = [
      'Title',
      'Category',
      'Status',
      'Priority',
      'Venue',
      'Event Date',
      'Budget (USD)',
      'Actual Spend (USD)',
      'Client / Sponsor',
      'Contact Person',
      'Registered Attendees',
      'Expected Capacity',
    ];
    const rows = tasks.map((t) => {
      const spent = (t.expenses || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
      return [
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.category || 'Meeting',
        t.status || 'Pending',
        t.priority || 'Medium',
        `"${(t.venue || '').replace(/"/g, '""')}"`,
        t.eventDate || '',
        t.budget || 0,
        spent,
        `"${(t.clientName || '').replace(/"/g, '""')}"`,
        `"${(t.contactPerson || '').replace(/"/g, '""')}"`,
        t.registeredAttendees || 0,
        t.expectedAttendees || 0,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mice_events_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported CSV report');
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);

  const getDateBadge = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date().toISOString().slice(0, 10);
    if (dateStr < today) return { label: 'Past / Overdue', bg: '#fee2e2', color: '#991b1b' };
    if (dateStr === today) return { label: 'Today', bg: '#dcfce7', color: '#166534' };
    return { label: dateStr, bg: '#e0e7ff', color: '#3730a3' };
  };

  const renderEventCard = (task) => {
    const statusKey = (task.status || 'Pending').replace(/\s+/g, '');
    const categoryKey = task.category || 'Meeting';
    const priorityKey = task.priority || 'Medium';

    const reg = Number(task.registeredAttendees) || 0;
    const cap = Math.max(1, Number(task.expectedAttendees) || 100);
    const fillPct = Math.min(100, Math.round((reg / cap) * 100));

    const spent = (task.expenses || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const isOverBudget = task.budget > 0 && spent > task.budget;

    const checklist = task.checklist || [];
    const doneCount = checklist.filter((c) => c.completed).length;
    const isSelected = selectedIds.includes(task._id);

    return (
      <article key={task._id} className={`event-card ${isSelected ? 'selected' : ''}`}>
        <div>
          <div className="badge-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelectId(task._id)}
                title="Select for bulk action"
              />
              <span className={`badge badge-category-${categoryKey}`}>{categoryKey}</span>
            </div>

            <select
              className={`quick-status-select status-${statusKey}`}
              value={task.status || 'Pending'}
              onChange={(e) => handleQuickStatusChange(task, e.target.value)}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <h3 className="event-title">{task.title}</h3>
          {task.description && <p className="event-desc">{task.description}</p>}
        </div>

        <div>
          <div className="event-meta">
            {task.venue && (
              <div>
                <strong>Venue:</strong> {task.venue}
              </div>
            )}
            {task.eventDate && (
              <div>
                <strong>Event Date:</strong> {task.eventDate}
              </div>
            )}
            {(task.clientName || task.contactPerson) && (
              <div>
                <strong>Client:</strong> {task.clientName || 'N/A'}
                {task.contactPerson ? ` (${task.contactPerson})` : ''}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <strong>Budget:</strong> {formatCurrency(task.budget)} (Spent:{' '}
                <strong style={{ color: isOverBudget ? '#dc2626' : 'inherit' }}>
                  {formatCurrency(spent)}
                </strong>
                )
              </span>
              {isOverBudget && (
                <span className="badge badge-priority-High" style={{ fontSize: '0.65rem' }}>
                  Over Budget
                </span>
              )}
            </div>
          </div>

          {/* Attendee Capacity Progress Bar + Live Check-In Buttons */}
          <div className="progress-block">
            <div className="progress-label">
              <span>
                Attendees: {reg} / {cap} ({fillPct}%)
              </span>
              <div className="checkin-btns">
                <button
                  type="button"
                  className="btn-micro"
                  onClick={() => handleQuickAttendeeChange(task, -1)}
                  title="Check out 1 attendee"
                >
                  -1
                </button>
                <button
                  type="button"
                  className="btn-micro"
                  onClick={() => handleQuickAttendeeChange(task, 1)}
                  title="Check in 1 attendee"
                >
                  +1
                </button>
                <button
                  type="button"
                  className="btn-micro"
                  onClick={() => handleQuickAttendeeChange(task, 10)}
                  title="Check in 10 attendees"
                >
                  +10
                </button>
              </div>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${fillPct}%`,
                  background: fillPct >= 90 ? '#22c55e' : '#6366f1',
                }}
              />
            </div>
          </div>

          {/* Interactive Event Checklist */}
          {checklist.length > 0 && (
            <div className="card-checklist">
              <div className="progress-label" style={{ marginBottom: '0.2rem' }}>
                <span>Ops Checklist</span>
                <span>
                  {doneCount}/{checklist.length} done
                </span>
              </div>
              {checklist.map((item, idx) => (
                <label
                  key={item._id || idx}
                  className={`checklist-item-row ${item.completed ? 'done' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(item.completed)}
                    onChange={() => handleToggleChecklistOnCard(task, idx)}
                  />
                  <span>{item.text}</span>
                </label>
              ))}
            </div>
          )}

          <div className="card-footer">
            <span className={`badge badge-priority-${priorityKey}`}>{priorityKey} Priority</span>

            <div className="card-actions">
              <button
                type="button"
                className="btn-icon"
                title="Open Expense Tracker & Event Inspector"
                onClick={() => setInspectTaskId(task._id)}
              >
                📊 Expenses
              </button>
              <button
                type="button"
                className="btn-icon"
                title="Print Operations Run-Sheet"
                onClick={() => handlePrintRunSheet(task)}
              >
                🖨
              </button>
              <button
                type="button"
                className="btn-icon"
                title="Duplicate this MICE event"
                onClick={() => handleDuplicate(task)}
              >
                Clone
              </button>
              <button type="button" className="btn-icon" onClick={() => handleEdit(task)}>
                Edit
              </button>
              <button
                type="button"
                className="btn-icon danger"
                onClick={() => setDeleteTarget(task)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  };

  const breakdown = stats?.categoryBreakdown || {};
  const totalBudgetSafe = Math.max(1, stats?.totalBudget || 1);

  return (
    <div className={`mice-shell ${darkMode ? 'dark-theme' : ''}`}>
      {/* Toast Alert */}
      {toast && <div className="toast-banner">{toast}</div>}

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bulk-floating-bar">
          <span>
            <strong>{selectedIds.length}</strong> event(s) selected
          </span>
          <button
            type="button"
            className="btn-header"
            onClick={() => handleBulkStatus('In Progress')}
          >
            Mark In Progress
          </button>
          <button
            type="button"
            className="btn-header"
            onClick={() => handleBulkStatus('Completed')}
          >
            Mark Completed
          </button>
          <button
            type="button"
            className="btn-header"
            style={{ background: '#dc2626', borderColor: '#ef4444' }}
            onClick={handleBulkDelete}
          >
            Delete Selected
          </button>
          <button
            type="button"
            className="btn-header"
            onClick={() => setSelectedIds([])}
          >
            Clear
          </button>
        </div>
      )}

      {/* Event Inspector & Budget vs. Actual Expense Tracker Modal */}
      {inspectedTask && (
        <div className="modal-backdrop" onClick={() => setInspectTaskId(null)}>
          <div className="inspector-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <span className={`badge badge-category-${inspectedTask.category || 'Conference'}`}>
                  {inspectedTask.category}
                </span>
                <h2 style={{ margin: '0.4rem 0 0.2rem' }}>{inspectedTask.title}</h2>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Venue: {inspectedTask.venue || 'TBD'} • Client: {inspectedTask.clientName || 'N/A'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handlePrintRunSheet(inspectedTask)}
                >
                  🖨 Print Run-Sheet
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setInspectTaskId(null)}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {(() => {
              const allocated = Number(inspectedTask.budget) || 0;
              const actualSpent = (inspectedTask.expenses || []).reduce(
                (s, x) => s + (Number(x.amount) || 0),
                0
              );
              const remaining = allocated - actualSpent;
              return (
                <>
                  <div className="expense-summary-grid">
                    <div className="expense-stat-box">
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Allocated Budget
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                        {formatCurrency(allocated)}
                      </div>
                    </div>
                    <div className="expense-stat-box">
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Actual Expenses
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#6366f1' }}>
                        {formatCurrency(actualSpent)}
                      </div>
                    </div>
                    <div className="expense-stat-box">
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Remaining Balance
                      </div>
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          color: remaining < 0 ? '#dc2626' : '#16a34a',
                        }}
                      >
                        {formatCurrency(remaining)}
                      </div>
                    </div>
                  </div>

                  <h4 style={{ margin: '1rem 0 0.5rem' }}>Line-Item Expense Ledger</h4>
                  <form
                    onSubmit={handleAddExpense}
                    style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}
                  >
                    <input
                      type="text"
                      className="mice-input"
                      placeholder="Expense item (e.g. Catering Deposit, AV Rigging)"
                      value={expenseTitle}
                      onChange={(e) => setExpenseTitle(e.target.value)}
                      required
                    />
                    <input
                      type="number"
                      min="1"
                      className="mice-input"
                      style={{ maxWidth: '150px' }}
                      placeholder="Amount ($)"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn-primary" style={{ flex: '0 0 auto' }}>
                      + Log Expense
                    </button>
                  </form>

                  <ul className="checklist-draft-list" style={{ maxHeight: '220px' }}>
                    {(inspectedTask.expenses || []).length === 0 ? (
                      <li style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        No line-item expenses recorded yet.
                      </li>
                    ) : (
                      (inspectedTask.expenses || []).map((exp, idx) => (
                        <li key={exp._id || idx} className="checklist-draft-item">
                          <span>{exp.title}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <strong>{formatCurrency(exp.amount)}</strong>
                            <button
                              type="button"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#dc2626',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                              onClick={() => handleRemoveExpense(idx)}
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3 style={{ margin: '0 0 0.5rem' }}>Delete MICE Event?</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 1.2rem' }}>
              Are you sure you want to permanently delete <strong>{deleteTarget.title}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-icon danger"
                style={{ padding: '0.55rem 1rem' }}
                onClick={confirmDelete}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Enterprise Header */}
      <header className="mice-header">
        <div className="mice-header-inner">
          <div className="mice-brand">
            <div className="mice-brand-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <h1>MICE Operations & Event Suite</h1>
              <p>Meetings • Incentives • Conferences • Exhibitions Management</p>
            </div>
          </div>

          <div className="header-actions">
            <button type="button" className="btn-header" onClick={handleSeedDemo}>
              ✨ Seed Demo Portfolio
            </button>
            <button
              type="button"
              className="btn-header"
              onClick={() => setShowActivity((prev) => !prev)}
            >
              🕒 Activity Log ({activityLog.length})
            </button>
            <button type="button" className="btn-header" onClick={handleExportCSV}>
              ⬇ Export CSV
            </button>
            <button
              type="button"
              className="btn-header"
              onClick={() => setDarkMode((prev) => !prev)}
            >
              {darkMode ? '☀ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
      </header>

      <main className="mice-container">
        {/* Collapsible Live Activity Audit Log */}
        {showActivity && (
          <section className="activity-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.88rem' }}>Recent Operations Audit Trail</strong>
              <button
                type="button"
                className="btn-icon"
                onClick={() => dispatch(clearActivityLog())}
              >
                Clear Log
              </button>
            </div>
            {activityLog.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
                No activity recorded in this session yet. Create, update, or seed events to see live logs.
              </p>
            ) : (
              <ul className="activity-list">
                {activityLog.map((entry) => (
                  <li key={entry.id} className="activity-item">
                    <span className="activity-time">[{entry.time}]</span>
                    <span>{entry.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Live KPI Stat Cards */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <div>
              <p className="kpi-label">Total MICE Events</p>
              <p className="kpi-value">{stats?.totalEvents ?? total}</p>
              <p className="kpi-sub">{stats?.pending ?? 0} Pending approval</p>
            </div>
            <div className="kpi-icon" style={{ background: '#e0e7ff', color: '#4338ca' }}>
              📅
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <p className="kpi-label">Active / In Progress</p>
              <p className="kpi-value">{stats?.inProgress ?? 0}</p>
              <p className="kpi-sub">{stats?.completed ?? 0} Completed</p>
            </div>
            <div className="kpi-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
              ⚡
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <p className="kpi-label">Registered Attendees</p>
              <p className="kpi-value">
                {stats?.totalRegistered ?? 0}{' '}
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                  / {stats?.totalCapacity ?? 0}
                </span>
              </p>
              <p className="kpi-sub">Live check-in capacity</p>
            </div>
            <div className="kpi-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
              👥
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <p className="kpi-label">Allocated Budget</p>
              <p className="kpi-value">{formatCurrency(stats?.totalBudget)}</p>
              <p className="kpi-sub">
                Actual Spend: <strong>{formatCurrency(stats?.totalSpent)}</strong>
              </p>
            </div>
            <div className="kpi-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
              💰
            </div>
          </div>
        </section>

        {/* Category & Budget Breakdown Bar */}
        <section className="breakdown-panel">
          <div className="breakdown-header">
            <span>MICE Category & Budget Allocation Breakdown</span>
            <span>
              Spent {formatCurrency(stats?.totalSpent)} of {formatCurrency(stats?.totalBudget)}
            </span>
          </div>
          <div className="breakdown-bar">
            {['Meeting', 'Incentive', 'Conference', 'Exhibition'].map((cat) => {
              const catBudget = breakdown[cat]?.budget || 0;
              const widthPct = stats?.totalBudget
                ? Math.max(4, Math.round((catBudget / totalBudgetSafe) * 100))
                : 25;
              return (
                <div
                  key={cat}
                  style={{
                    width: `${widthPct}%`,
                    background: categoryColors[cat],
                  }}
                  title={`${cat}: ${formatCurrency(catBudget)}`}
                />
              );
            })}
          </div>
          <div className="breakdown-legend">
            {['Meeting', 'Incentive', 'Conference', 'Exhibition'].map((cat) => (
              <div key={cat} className="legend-item">
                <span className="legend-dot" style={{ background: categoryColors[cat] }} />
                <span>
                  <strong>{cat}s:</strong> {breakdown[cat]?.count || 0} (
                  {formatCurrency(breakdown[cat]?.budget || 0)})
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Main 2-Column Workspace */}
        <div className="mice-layout">
          {/* Left Column: Create / Edit MICE Event Form */}
          <aside className="mice-panel">
            <h2 className="panel-title">
              <span>{editId ? 'Edit MICE Event' : 'Schedule New MICE Event'}</span>
              {editId && (
                <span className="badge badge-category-Meeting" style={{ fontSize: '0.7rem' }}>
                  Editing
                </span>
              )}
            </h2>

            <form onSubmit={handleSubmit} className="mice-form">
              <div className="form-group">
                <label>Event / Task Title *</label>
                <input
                  type="text"
                  className="mice-input"
                  placeholder="e.g. Global FinTech Summit 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>MICE Category</label>
                  <select
                    className="mice-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Meeting">Meeting</option>
                    <option value="Incentive">Incentive</option>
                    <option value="Conference">Conference</option>
                    <option value="Exhibition">Exhibition</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    className="mice-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    className="mice-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Budget (USD)</label>
                  <input
                    type="number"
                    min="0"
                    className="mice-input"
                    placeholder="25000"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Venue / Location</label>
                  <input
                    type="text"
                    className="mice-input"
                    placeholder="Grand Expo Hall A"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Event Date</label>
                  <input
                    type="date"
                    className="mice-input"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Client / Sponsor</label>
                  <input
                    type="text"
                    className="mice-input"
                    placeholder="Acme Corp"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Lead Coordinator</label>
                  <input
                    type="text"
                    className="mice-input"
                    placeholder="Sarah Jenkins"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Registered Attendees</label>
                  <input
                    type="number"
                    min="0"
                    className="mice-input"
                    value={formData.registeredAttendees}
                    onChange={(e) =>
                      setFormData({ ...formData, registeredAttendees: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Venue Capacity</label>
                  <input
                    type="number"
                    min="1"
                    className="mice-input"
                    value={formData.expectedAttendees}
                    onChange={(e) =>
                      setFormData({ ...formData, expectedAttendees: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Operational Checklist Builder */}
              <div className="form-group">
                <label>Operational Checklist / Sub-tasks</label>
                <div className="checklist-builder">
                  <div className="checklist-input-row">
                    <input
                      type="text"
                      className="mice-input"
                      placeholder="e.g. Confirm AV & stage lighting"
                      value={checklistInput}
                      onChange={(e) => setChecklistInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddChecklistItem();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleAddChecklistItem}
                    >
                      + Add
                    </button>
                  </div>

                  {formData.checklist?.length > 0 && (
                    <ul className="checklist-draft-list">
                      {formData.checklist.map((item, idx) => (
                        <li key={idx} className="checklist-draft-item">
                          <span>{item.text}</span>
                          <button
                            type="button"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                            onClick={() => handleRemoveChecklistItem(idx)}
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Operations & Logistics Notes</label>
                <textarea
                  className="mice-textarea"
                  placeholder="AV setup, keynote speakers, catering & booth requirements..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editId ? 'Update Event' : 'Create Event'}
                </button>
                {editId && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setEditId(null);
                      setFormData(initialForm);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </aside>

          {/* Right Column: View Switcher, Search/Filter/Sort Bar & Views */}
          <section className="mice-panel">
            <div className="workspace-top">
              <div className="view-tabs">
                <button
                  type="button"
                  className={`view-tab ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  ⊞ Grid View
                </button>
                <button
                  type="button"
                  className={`view-tab ${viewMode === 'kanban' ? 'active' : ''}`}
                  onClick={() => setViewMode('kanban')}
                >
                  ☰ Kanban Board
                </button>
                <button
                  type="button"
                  className={`view-tab ${viewMode === 'timeline' ? 'active' : ''}`}
                  onClick={() => setViewMode('timeline')}
                >
                  📅 Timeline View
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {hasActiveFilters && (
                  <button type="button" className="btn-icon" onClick={handleResetFilters}>
                    ✕ Reset Filters
                  </button>
                )}
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Showing <strong>{tasks.length}</strong> of <strong>{total}</strong> events
                </span>
              </div>
            </div>

            {/* Search, Filter & Sort Toolbar */}
            <div className="filter-bar">
              <div className="search-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="mice-input"
                  placeholder="Search title, venue, client..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <span className="kbd-hint">/</span>
              </div>

              <select
                className="mice-select"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All Categories</option>
                <option value="Meeting">Meetings</option>
                <option value="Incentive">Incentives</option>
                <option value="Conference">Conferences</option>
                <option value="Exhibition">Exhibitions</option>
              </select>

              <select
                className="mice-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>

              <select
                className="mice-select"
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All Priorities</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>

              <select
                className="mice-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="newest">Sort: Newest First</option>
                <option value="dateAsc">Sort: Event Date (Soonest)</option>
                <option value="budgetDesc">Sort: Budget (High → Low)</option>
                <option value="budgetAsc">Sort: Budget (Low → High)</option>
                <option value="titleAsc">Sort: Title (A → Z)</option>
              </select>
            </div>

            {error && (
              <p style={{ color: '#dc2626', fontSize: '0.88rem', marginBottom: '1rem' }}>
                Error connecting to server: {error}
              </p>
            )}

            {loading ? (
              <p style={{ color: 'var(--text-muted)', padding: '2rem 0', textAlign: 'center' }}>
                Loading MICE events...
              </p>
            ) : tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.3rem' }}>
                  No MICE events found
                </p>
                <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Schedule a new event on the left, adjust filters, or populate sample MICE data:
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ maxWidth: '240px', margin: '0 auto' }}
                  onClick={handleSeedDemo}
                >
                  ✨ Load 6 Sample MICE Events
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <>
                <div className="event-grid">{tasks.map((task) => renderEventCard(task))}</div>

                {/* Pagination Bar */}
                <div className="pagination-bar">
                  <span>
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total)
                  </span>

                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="btn-page"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn-page"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : viewMode === 'kanban' ? (
              /* Kanban Board View */
              <div className="kanban-grid">
                {['Pending', 'In Progress', 'Completed'].map((colStatus) => {
                  const colTasks = tasks.filter((t) => (t.status || 'Pending') === colStatus);
                  return (
                    <div key={colStatus} className="kanban-col">
                      <h3 className="kanban-col-header">
                        <span>{colStatus}</span>
                        <span className="badge badge-priority-Low">{colTasks.length}</span>
                      </h3>
                      <div className="kanban-stack">
                        {colTasks.map((task) => renderEventCard(task))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Timeline / Calendar View */
              <div className="timeline-list">
                {[...tasks]
                  .sort((a, b) => (a.eventDate || '9999').localeCompare(b.eventDate || '9999'))
                  .map((task) => {
                    const dateBadge = getDateBadge(task.eventDate);
                    return (
                      <div key={task._id} className="timeline-item">
                        <div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span className={`badge badge-category-${task.category || 'Meeting'}`}>
                              {task.category || 'Meeting'}
                            </span>
                            {dateBadge && (
                              <span
                                className="badge"
                                style={{ background: dateBadge.bg, color: dateBadge.color }}
                              >
                                {dateBadge.label}
                              </span>
                            )}
                            <strong>{task.title}</strong>
                          </div>
                          <p
                            style={{
                              margin: '0.3rem 0 0',
                              fontSize: '0.8rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            Venue: {task.venue || 'TBD'} • Client: {task.clientName || 'N/A'} •
                            Attendees: {task.registeredAttendees || 0}/{task.expectedAttendees || 100}{' '}
                            • Budget: {formatCurrency(task.budget)}
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <select
                            className={`quick-status-select status-${(
                              task.status || 'Pending'
                            ).replace(/\s+/g, '')}`}
                            value={task.status || 'Pending'}
                            onChange={(e) => handleQuickStatusChange(task, e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => setInspectTaskId(task._id)}
                          >
                            📊 Expenses
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleEdit(task)}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
