// src/hub/report.js
// Teacher Hub reporting (Phase 7D). Every committed answer is passed here with
// its stable question id. The protocol must copy the teacher's Lesson 5 deck
// in docs/reference/, which has not been supplied yet, so for now answers are
// only queued in memory and nothing leaves the device.
const queue = [];

export function report(record) {
  queue.push({ ...record, at: Date.now() });
}

export function pendingReports() {
  return [...queue];
}
