import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/tasks';

// Async Thunks
export const fetchTasks = createAsyncThunk(
  'tasks/fetchAll',
  async ({
    search = '',
    status = '',
    category = '',
    priority = '',
    sortBy = 'newest',
    page = 1,
    limit = 6,
  } = {}) => {
    const response = await axios.get(API_URL, {
      params: { search, status, category, priority, sortBy, page, limit },
    });
    return response.data;
  }
);

export const createTask = createAsyncThunk('tasks/create', async (taskData) => {
  const response = await axios.post(API_URL, taskData);
  return response.data;
});

export const seedTasks = createAsyncThunk('tasks/seed', async () => {
  const response = await axios.post(`${API_URL}/seed`);
  return response.data;
});

export const bulkTasksAction = createAsyncThunk('tasks/bulk', async (payload) => {
  const response = await axios.post(`${API_URL}/bulk`, payload);
  return response.data;
});

export const updateTask = createAsyncThunk('tasks/update', async ({ id, taskData }) => {
  const response = await axios.put(`${API_URL}/${id}`, taskData);
  return response.data;
});

export const deleteTask = createAsyncThunk('tasks/delete', async (id) => {
  await axios.delete(`${API_URL}/${id}`);
  return id;
});

const defaultStats = {
  totalEvents: 0,
  completed: 0,
  inProgress: 0,
  pending: 0,
  totalBudget: 0,
  totalSpent: 0,
  totalRegistered: 0,
  totalCapacity: 0,
  categoryBreakdown: {
    Meeting: { count: 0, budget: 0 },
    Incentive: { count: 0, budget: 0 },
    Conference: { count: 0, budget: 0 },
    Exhibition: { count: 0, budget: 0 },
  },
};

const addLog = (state, text) => {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  state.activityLog.unshift({ id: Date.now() + Math.random(), time, text });
  if (state.activityLog.length > 25) state.activityLog.pop();
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState: {
    items: [],
    loading: false,
    error: null,
    page: 1,
    totalPages: 1,
    total: 0,
    stats: defaultStats,
    activityLog: [],
  },
  reducers: {
    clearActivityLog: (state) => {
      state.activityLog = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        if (Array.isArray(action.payload)) {
          state.items = action.payload;
        } else {
          state.items = action.payload.tasks || [];
          state.page = action.payload.page || 1;
          state.totalPages = action.payload.totalPages || 1;
          state.total = action.payload.total || 0;
          if (action.payload.stats) {
            state.stats = { ...defaultStats, ...action.payload.stats };
          }
        }
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Create
      .addCase(createTask.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.total += 1;
        addLog(state, `Scheduled "${action.payload.title}" (${action.payload.category})`);
      })
      // Seed
      .addCase(seedTasks.fulfilled, (state, action) => {
        addLog(state, action.payload.message || 'Seeded sample MICE portfolio');
      })
      // Bulk Action
      .addCase(bulkTasksAction.fulfilled, (state, action) => {
        addLog(state, action.payload.message || 'Executed bulk action');
      })
      // Update
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.items.findIndex((t) => t._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        addLog(state, `Updated "${action.payload.title}" → ${action.payload.status}`);
      })
      // Delete
      .addCase(deleteTask.fulfilled, (state, action) => {
        const removed = state.items.find((t) => t._id === action.payload);
        state.items = state.items.filter((t) => t._id !== action.payload);
        state.total = Math.max(0, state.total - 1);
        addLog(state, `Deleted event "${removed?.title || action.payload}"`);
      });
  },
});

export const { clearActivityLog } = taskSlice.actions;
export default taskSlice.reducer;
