// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export class ScheduleState {
    constructor(index, initialState) {
      this.index = index;
      this.isEditing = false;
      this.tempState = initialState; // Initial state of the schedule
    }
  
    toggleEditing() {
      this.isEditing = !this.isEditing;
    }
  
    updateTempState(updatedState) {
      this.tempState = { ...this.tempState, ...updatedState };
    }
  }

