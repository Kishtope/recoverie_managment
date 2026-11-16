import axios from "axios";

// Shared client for our own /api routes; the auth cookie is httpOnly so the browser attaches it automatically.
export const api = axios.create({ baseURL: "/api" });
