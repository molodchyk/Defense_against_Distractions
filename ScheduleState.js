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