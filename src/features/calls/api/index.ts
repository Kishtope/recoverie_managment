import { api } from "@/lib/axios";
import { BASE_PATH } from "@/lib/base-path";
import type { CallItem, CallListQuery, CallListResponse, PendingCall, SimulateInput, StartCallInput } from "../types";

// A call plus whether the Simulate panel may be shown for it (mock provider, non-production, the agent's own call).
export type CallResponse = { call: CallItem; canSimulate: boolean };

// Places a call. Only the case and "primary" / "alt" are sent; the server looks up the real number.
export const startCall = async (input: StartCallInput) => {
  const { data } = await api.post<CallResponse>("/calls/start", input);
  return data;
};

// One call's current state (polled while it rings).
export const getCall = async (id: string) => {
  const { data } = await api.get<CallResponse>(`/calls/${id}`);
  return data;
};

// One page of calls; empty filters are left out of the query.
export const getCalls = async (query: CallListQuery) => {
  const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== "" && v !== "all"));
  const { data } = await api.get<CallListResponse>("/calls", { params });
  return data;
};

// The agent's call that still needs an outcome, or null.
export const getPendingCall = async () => {
  const { data } = await api.get<{ call: PendingCall | null }>("/calls/pending");
  return data.call;
};

// Dev only: ends a test call as answered / missed / failed.
export const simulateCall = async ({ callId, ...body }: SimulateInput) => {
  const { data } = await api.post<{ ok: true }>(`/dev/calls/${callId}/simulate`, body);
  return data;
};

// Where the audio player loads a recording from (the server checks access and logs the play); the browser never sees the provider's URL.
export const recordingSrc = (callId: string) => `${BASE_PATH}/api/calls/${callId}/recording`;
