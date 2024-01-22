/*
 * Defense Against Distractions Extension
 *
 * file: ScheduleState.js
 * 
 * This file is part of the Defense Against Distractions Extension.
 *
 * Defense Against Distractions Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Defense Against Distractions Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Defense Against Distractions Extension. If not, see <http://www.gnu.org/licenses/>.
 *
 * Author: Oleksandr Molodchyk
 * Copyright (C) 2023 Oleksandr Molodchyk
 */

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