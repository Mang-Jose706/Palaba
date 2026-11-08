// Tiny persistence layer for the mock API. Data lives in localStorage (falls
// back to memory when storage is unavailable). Swap the API modules for real
// fetch() calls later — components only talk to src/api/*.

import mockData from '../data/mock.js'

const KEY = 'palaba:data:v2' // bump when the mock data shape changes
const listeners = new Set()
let memory = null

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function storage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function getData() {
  if (memory) return memory
  const ls = storage()
  try {
    const saved = ls?.getItem(KEY)
    if (saved) {
      memory = JSON.parse(saved)
      return memory
    }
  } catch {
    // corrupted or blocked storage → start from mock data
  }
  memory = clone(mockData)
  persist()
  return memory
}

function persist() {
  try {
    storage()?.setItem(KEY, JSON.stringify(memory))
  } catch {
    // storage full or blocked — keep working in memory
  }
}

/**
 * Apply a change to the data, save it, and notify subscribers.
 * All-or-nothing: the change runs on a copy, so if it throws (a rule or
 * validation error) nothing is saved.
 */
export function mutate(fn) {
  const draft = clone(getData())
  const result = fn(draft)
  memory = draft
  persist()
  listeners.forEach((l) => l())
  return result
}

/** Call `listener` whenever data changes. Returns an unsubscribe function. */
export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Restore the original mock data (useful while developing). */
export function resetData() {
  memory = clone(mockData)
  persist()
  listeners.forEach((l) => l())
}

/** Return a copy so callers can't mutate stored data by accident. */
export function snapshot(value) {
  return value == null ? value : clone(value)
}

/** Mimic network latency so components handle async from the start. */
export function respond(value, ms = 80) {
  return new Promise((resolve) => setTimeout(() => resolve(snapshot(value)), ms))
}

export function fail(message) {
  return Promise.reject(new Error(message))
}

export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
