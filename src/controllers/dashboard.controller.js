import {
  getDashboard,
  getGmailDashboard,
  getGithubDashboard,
  getPostgresDashboard,
  getQueueDashboard,
} from "../services/dashboardService.service.js";

export default {
  overview: async (_req, res) => {
    try {
      res.json({ success: true, data: await getDashboard() });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  gmail: async (_req, res) => {
    try {
      res.json({ success: true, data: await getGmailDashboard() });
    } catch (error) {
      res.json({ success: true, data: { status: "unavailable", unread: 0, recent: [], error: error.message } });
    }
  },
  github: async (_req, res) => {
    try {
      res.json({ success: true, data: await getGithubDashboard() });
    } catch (error) {
      res.json({ success: true, data: { status: "unavailable", repositories: [], error: error.message } });
    }
  },
  postgres: async (_req, res) => {
    try {
      res.json({ success: true, data: await getPostgresDashboard() });
    } catch (error) {
      res.json({ success: true, data: { status: "unavailable", databases: [], tables: [], error: error.message } });
    }
  },
  queues: async (_req, res) => {
    try {
      res.json({ success: true, data: await getQueueDashboard() });
    } catch (error) {
      res.json({ success: true, data: { status: "unavailable", send: {}, delete: {}, error: error.message } });
    }
  },
};
